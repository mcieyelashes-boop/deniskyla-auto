// /api/worker — the queue processor.
//
// Invoked two ways:
//   1. Vercel Cron (sends header x-cron-secret === process.env.CRON_SECRET).
//      In cron mode it ALSO runs the scheduler tick (enqueues due schedules).
//   2. Manually by a verified Clerk user ("process my jobs now"). The user may
//      forward their BYOK Anthropic key via the x-user-api-key header.
//
// It leases up to MAX_JOBS pending jobs per invocation (to stay within the
// serverless time budget), runs each agent handler, records output, and
// flips finished runs to done/error.
//
// BYOK LIMITATION: We never persist user Anthropic keys. Background cron
// invocations therefore have NO access to a user's BYOK key and fall back to
// process.env.ANTHROPIC_API_KEY. Only user-triggered manual calls can supply a
// key (via the x-user-api-key header), which we forward to the handler.

import { getAdmin, HAS_DB } from "../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../lib/server/clerkVerify.js";
import { callClaudeServer } from "../lib/server/claudeServer.js";
import { enqueueRun, computeNextRun } from "../lib/server/enqueue.js";

const MAX_JOBS = 5;
const BACKOFF_BASE_MS = 30 * 1000; // 30s * attempts

// Lazily-resolved agent registry. May not exist yet (built by a parallel
// agent), so we import defensively and cache the result.
let _handlersPromise = null;
async function getAgentHandlers() {
  if (_handlersPromise) return _handlersPromise;
  _handlersPromise = (async () => {
    try {
      const mod = await import("../lib/server/agents/index.js");
      return mod.AGENT_HANDLERS || {};
    } catch {
      return {};
    }
  })();
  return _handlersPromise;
}

// Generic Claude-only fallback used when no registered handler exists.
function fallbackHandler(agentId) {
  return async ({ task, userApiKey }) => {
    const system =
      `You are the "${agentId}" agent in an automated business workflow. ` +
      `Complete the task concisely and return 4-5 actionable bullet points.`;
    const output = await callClaudeServer({
      system,
      userMsg: task || `Run the ${agentId} agent task.`,
      apiKey: userApiKey,
    });
    return { output };
  };
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: "Forbidden" });
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!HAS_DB) return res.status(501).json({ error: "DB not configured" });
  const admin = getAdmin();
  if (!admin) return res.status(501).json({ error: "DB not configured" });

  // --- Auth: cron secret OR a verified user -------------------------------
  // Accept either our explicit x-cron-secret header (manual/cron pings) or the
  // Authorization: Bearer <CRON_SECRET> header that Vercel Cron itself sends.
  const cronSecret = req.headers["x-cron-secret"];
  const authBearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const isCron =
    !!process.env.CRON_SECRET &&
    (cronSecret === process.env.CRON_SECRET || authBearer === process.env.CRON_SECRET);

  let userId = null;
  if (!isCron) {
    userId = await userFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
  }

  // BYOK key only available on manual user calls.
  const userApiKey = req.headers["x-user-api-key"] || null;

  try {
    // Cron invocations also advance due schedules before processing jobs.
    let scheduledRuns = [];
    if (isCron) {
      scheduledRuns = await runSchedulerTick(admin);
    }

    const results = await processJobs({ admin, userId, isCron, userApiKey });

    return res.json({
      processed: results.length,
      results,
      scheduled: scheduledRuns.length,
      scheduledRuns,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// --- Job processing --------------------------------------------------------

async function processJobs({ admin, userId, isCron, userApiKey }) {
  const nowIso = new Date().toISOString();

  // Candidate pending jobs whose run_after is due. When a user triggers
  // manually we only touch their own jobs; cron processes everyone's.
  let q = admin
    .from("jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_after", nowIso)
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS * 3); // over-fetch; some leases may lose the race
  if (!isCron && userId) q = q.eq("clerk_user_id", userId);

  const { data: candidates, error: candErr } = await q;
  if (candErr) throw new Error(`lease select failed: ${candErr.message}`);

  const results = [];
  const affectedRunIds = new Set();

  for (const candidate of candidates || []) {
    if (results.length >= MAX_JOBS) break;

    // Atomic lease: only succeeds if the row is STILL pending. The
    // status='pending' guard prevents two concurrent workers from both
    // grabbing the same job (the second update matches 0 rows).
    const leaseIso = new Date().toISOString();
    const { data: leased, error: leaseErr } = await admin
      .from("jobs")
      .update({
        status: "running",
        locked_at: leaseIso,
        attempts: (candidate.attempts || 0) + 1,
        updated_at: leaseIso,
      })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (leaseErr) {
      results.push({ jobId: candidate.id, status: "lease-error", error: leaseErr.message });
      continue;
    }
    if (!leased) continue; // lost the race — another worker took it.

    const outcome = await runJob({ admin, job: leased, userApiKey });
    affectedRunIds.add(leased.run_id);
    results.push(outcome);
  }

  // Reconcile every run we touched.
  for (const runId of affectedRunIds) {
    await reconcileRun(admin, runId);
  }

  return results;
}

async function runJob({ admin, job, userApiKey }) {
  const nowIso = () => new Date().toISOString();

  try {
    // Load the run for context.
    const { data: run } = await admin
      .from("flow_runs")
      .select("id, clerk_user_id, context, status")
      .eq("id", job.run_id)
      .maybeSingle();

    // Mark the run as running on first job pickup.
    if (run && run.status === "queued") {
      await admin
        .from("flow_runs")
        .update({ status: "running", started_at: nowIso() })
        .eq("id", job.run_id)
        .eq("status", "queued");
    }

    // Gather prior outputs (chain context) ordered by their step.
    const { data: prevOutputs } = await admin
      .from("agent_outputs")
      .select("agent_id, agent_name, task, output, output_data, created_at")
      .eq("run_id", job.run_id)
      .order("created_at", { ascending: true });

    // Resolve the handler (registered or fallback).
    const handlers = await getAgentHandlers();
    const handler = handlers[job.agent_id] || fallbackHandler(job.agent_id);

    const { output, outputData } = await handler({
      task: job.task,
      userApiKey,
      clerkUserId: job.clerk_user_id,
      runId: job.run_id,
      agentId: job.agent_id,
      previousOutputs: prevOutputs || [],
      context: run?.context ?? null,
    });

    const safeOutput = typeof output === "string" ? output : JSON.stringify(output ?? "");

    // Record the agent output.
    await admin.from("agent_outputs").insert({
      run_id: job.run_id,
      clerk_user_id: job.clerk_user_id,
      agent_id: job.agent_id,
      agent_name: job.agent_id,
      task: job.task,
      output: safeOutput,
      output_data: outputData ?? null,
      status: "done",
      created_at: nowIso(),
    });

    // Mark the job done.
    await admin
      .from("jobs")
      .update({ status: "done", result: { output: safeOutput }, error: null, updated_at: nowIso() })
      .eq("id", job.id);

    return { jobId: job.id, agentId: job.agent_id, status: "done" };
  } catch (e) {
    const attempts = job.attempts || 0; // already incremented during lease
    const maxAttempts = job.max_attempts || 3;
    const msg = e?.message || String(e);

    if (attempts < maxAttempts) {
      // Retry with linear backoff (30s * attempts).
      const runAfter = new Date(Date.now() + BACKOFF_BASE_MS * attempts).toISOString();
      await admin
        .from("jobs")
        .update({ status: "pending", run_after: runAfter, error: msg, updated_at: nowIso() })
        .eq("id", job.id);
      return { jobId: job.id, agentId: job.agent_id, status: "retry", attempts, error: msg };
    }

    // Permanent failure.
    await admin
      .from("jobs")
      .update({ status: "error", error: msg, updated_at: nowIso() })
      .eq("id", job.id);
    return { jobId: job.id, agentId: job.agent_id, status: "error", error: msg };
  }
}

// Flip a run to done/error once all of its jobs settle.
async function reconcileRun(admin, runId) {
  const { data: jobs } = await admin
    .from("jobs")
    .select("status")
    .eq("run_id", runId);
  if (!jobs || jobs.length === 0) return;

  const anyError = jobs.some((j) => j.status === "error");
  const allDone = jobs.every((j) => j.status === "done");
  const stillWorking = jobs.some((j) => j.status === "pending" || j.status === "running");

  if (anyError && !stillWorking) {
    await admin
      .from("flow_runs")
      .update({ status: "error", finished_at: new Date().toISOString() })
      .eq("id", runId);
  } else if (allDone) {
    await admin
      .from("flow_runs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", runId);
  }
}

// --- Scheduler tick (cron only) -------------------------------------------

async function runSchedulerTick(admin) {
  const nowIso = new Date().toISOString();
  const created = [];

  const { data: due, error } = await admin
    .from("schedules")
    .select("*")
    .eq("enabled", true)
    .lte("next_run", nowIso);
  if (error) return created; // don't let scheduler errors kill job processing

  for (const s of due || []) {
    try {
      const tasks = s.tasks || s.agent_tasks || {};
      const { runId, jobCount } = await enqueueRun({
        admin,
        clerkUserId: s.clerk_user_id,
        flowId: s.flow_id,
        flowName: s.flow_name,
        chain: s.chain,
        context: s.context ?? null,
        tasks,
      });

      await admin
        .from("schedules")
        .update({
          last_run: nowIso,
          next_run: computeNextRun(s.interval, s.time),
        })
        .eq("id", s.id);

      created.push({ scheduleId: s.id, runId, jobCount });
    } catch (e) {
      created.push({ scheduleId: s.id, error: e.message });
    }
  }

  return created;
}
