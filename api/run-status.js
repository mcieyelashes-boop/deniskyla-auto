// GET /api/run-status?runId=... — poll a single run (must be owned by the user).
//   Returns { run, jobs:[{agent_id, step_index, status, error}],
//             outputs:[{agent_id, agent_name, output, output_data, created_at}] }
// GET /api/run-status (no runId) — list the user's 20 most recent flow_runs.
import { getAdmin, HAS_DB } from "../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../lib/server/clerkVerify.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: "Forbidden" });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const userId = await userFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!HAS_DB) return res.status(501).json({ error: "DB not configured" });
  const admin = getAdmin();
  if (!admin) return res.status(501).json({ error: "DB not configured" });

  const runId = req.query?.runId;

  // No runId → list recent runs for this user.
  if (!runId) {
    const { data, error } = await admin
      .from("flow_runs")
      .select("id, flow_id, flow_name, chain, status, started_at, finished_at, error, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ runs: data || [] });
  }

  // Single run — verify ownership.
  const { data: run, error: runErr } = await admin
    .from("flow_runs")
    .select("*")
    .eq("id", runId)
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (runErr) return res.status(500).json({ error: runErr.message });
  if (!run) return res.status(404).json({ error: "Run not found" });

  const { data: jobs, error: jobsErr } = await admin
    .from("jobs")
    .select("agent_id, step_index, status, error, attempts, max_attempts")
    .eq("run_id", runId)
    .eq("clerk_user_id", userId)
    .order("step_index", { ascending: true });
  if (jobsErr) return res.status(500).json({ error: jobsErr.message });

  const { data: outputs, error: outErr } = await admin
    .from("agent_outputs")
    .select("agent_id, agent_name, output, output_data, status, created_at")
    .eq("run_id", runId)
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: true });
  if (outErr) return res.status(500).json({ error: outErr.message });

  return res.json({ run, jobs: jobs || [], outputs: outputs || [] });
}
