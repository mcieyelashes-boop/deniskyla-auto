// POST /api/run — enqueue a flow run.
// Body: { flowId, flowName, chain: [agentId...], context, tasks: { agentId: task } }
// Returns: { runId, jobCount }
import { getAdmin, HAS_DB } from "../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../lib/server/clerkVerify.js";
import { enqueueRun } from "../lib/server/enqueue.js";
import { getPlan, getUsageToday, recordUsage, PLAN_LIMITS } from "../lib/server/usage.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: "Forbidden" });
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await userFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!HAS_DB) return res.status(501).json({ error: "DB not configured" });
  const admin = getAdmin();
  if (!admin) return res.status(501).json({ error: "DB not configured" });

  const { flowId, flowName, chain, context, tasks } = req.body || {};
  if (!Array.isArray(chain) || chain.length === 0) {
    return res.status(400).json({ error: "chain must be a non-empty array" });
  }

  // ── Server-side daily flow limit enforcement (don't trust the client) ──
  try {
    const plan = await getPlan({ clerkUserId: userId });
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    const dailyLimit = limits.flowsPerDay;
    if (dailyLimit !== Infinity) {
      const usedToday = await getUsageToday({ clerkUserId: userId, kind: "flow_run" });
      if (usedToday >= dailyLimit) {
        return res
          .status(402)
          .json({ error: "Daily flow limit reached", code: "limit" });
      }
    }
  } catch (e) {
    console.warn("[run] limit check failed, allowing:", e.message);
  }

  try {
    const { runId, jobCount } = await enqueueRun({
      admin,
      clerkUserId: userId,
      flowId,
      flowName,
      chain,
      context,
      tasks,
    });
    // Record the flow_run usage event after a successful enqueue.
    await recordUsage({
      clerkUserId: userId,
      kind: "flow_run",
      units: 1,
      meta: { runId },
    });
    return res.json({ runId, jobCount });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
