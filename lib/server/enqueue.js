// Shared enqueue helper used by api/run.js and the scheduler tick in api/worker.js.
// Creates a flow_runs row + one jobs row per agent in the chain.
//
// All DB access uses the service-role admin client (RLS bypassed), so every
// caller MUST pass a trusted clerkUserId that it has already verified.

const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Insert a flow_run and its pending jobs.
 * @returns {Promise<{ runId: string, jobCount: number }>}
 */
export async function enqueueRun({
  admin,
  clerkUserId,
  flowId,
  flowName,
  chain,
  context,
  tasks,
}) {
  if (!admin) throw new Error("No admin client");
  if (!clerkUserId) throw new Error("clerkUserId required");
  if (!Array.isArray(chain) || chain.length === 0) {
    throw new Error("chain must be a non-empty array");
  }

  const nowIso = new Date().toISOString();
  const safeTasks = tasks && typeof tasks === "object" ? tasks : {};

  // 1. Create the flow_run (status 'queued').
  const { data: run, error: runErr } = await admin
    .from("flow_runs")
    .insert({
      clerk_user_id: clerkUserId,
      flow_id: flowId ?? null,
      flow_name: flowName ?? null,
      chain,
      status: "queued",
      context: context ?? null,
      started_at: null,
      created_at: nowIso,
    })
    .select("id")
    .single();

  if (runErr) throw new Error(`flow_runs insert failed: ${runErr.message}`);
  const runId = run.id;

  // 2. Create one pending job per agent in the chain, preserving order.
  const jobRows = chain.map((agentId, idx) => ({
    run_id: runId,
    clerk_user_id: clerkUserId,
    agent_id: agentId,
    step_index: idx,
    task: safeTasks[agentId] || "",
    status: "pending",
    attempts: 0,
    max_attempts: DEFAULT_MAX_ATTEMPTS,
    run_after: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  const { error: jobsErr } = await admin.from("jobs").insert(jobRows);
  if (jobsErr) {
    // Best-effort cleanup so we don't leave an orphan run with no jobs.
    await admin.from("flow_runs").delete().eq("id", runId);
    throw new Error(`jobs insert failed: ${jobsErr.message}`);
  }

  return { runId, jobCount: jobRows.length };
}

/**
 * Compute the next run timestamp for a schedule.
 * @param {"hourly"|"daily"|"weekly"} interval
 * @param {string} time "HH:MM" (used for daily/weekly)
 * @returns {string} ISO timestamp
 */
export function computeNextRun(interval, time = "09:00") {
  const now = new Date();
  const [h, m] = String(time || "09:00")
    .split(":")
    .map((n) => parseInt(n, 10) || 0);

  if (interval === "hourly") {
    return new Date(now.getTime() + 3600 * 1000).toISOString();
  }

  const next = new Date(now);
  next.setHours(h, m, 0, 0);

  if (interval === "weekly") {
    // Advance to the next occurrence at least a few seconds in the future.
    while (next <= now) next.setDate(next.getDate() + 7);
  } else {
    // Treat anything else (including 'daily') as daily.
    while (next <= now) next.setDate(next.getDate() + 1);
  }

  return next.toISOString();
}
