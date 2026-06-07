// /api/schedules — persistent schedule CRUD (replaces the in-memory api/schedule.js).
//   GET                       → list the user's schedules
//   POST { flowId, flowName, chain, interval, time, tasks, context }
//                             → create (next_run computed from interval+time)
//   POST { id, enabled }      → toggle enabled (no chain needed)
//   PATCH { id, enabled, ... }→ update fields
//   DELETE ?id=...            → remove
import { getAdmin, HAS_DB } from "../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../lib/server/clerkVerify.js";
import { computeNextRun } from "../lib/server/enqueue.js";

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: "Forbidden" });
  if (req.method === "OPTIONS") return res.status(200).end();

  const userId = await userFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  if (!HAS_DB) return res.status(501).json({ error: "DB not configured" });
  const admin = getAdmin();
  if (!admin) return res.status(501).json({ error: "DB not configured" });

  // --- GET: list ---
  if (req.method === "GET") {
    const { data, error } = await admin
      .from("schedules")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ schedules: data || [] });
  }

  // --- DELETE: remove ---
  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await admin
      .from("schedules")
      .delete()
      .eq("id", id)
      .eq("clerk_user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  // --- POST / PATCH ---
  if (req.method === "POST" || req.method === "PATCH") {
    const body = req.body || {};
    const { id, enabled } = body;

    // Toggle / update an existing schedule (id present, no new chain).
    if (id) {
      const patch = { };
      if (typeof enabled === "boolean") patch.enabled = enabled;
      if (Array.isArray(body.chain) && body.chain.length) patch.chain = body.chain;
      if (body.flowName !== undefined) patch.flow_name = body.flowName;
      if (body.flowId !== undefined) patch.flow_id = body.flowId;
      if (body.tasks !== undefined) patch.tasks = body.tasks;
      if (body.context !== undefined) patch.context = body.context;
      if (body.interval !== undefined) {
        patch.interval = body.interval;
        patch.next_run = computeNextRun(body.interval, body.time);
      } else if (body.time !== undefined) {
        // time changed without interval — recompute using existing-ish daily default
        patch.time = body.time;
      }
      if (body.time !== undefined) patch.time = body.time;

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: "nothing to update" });
      }

      const { data, error } = await admin
        .from("schedules")
        .update(patch)
        .eq("id", id)
        .eq("clerk_user_id", userId)
        .select("*")
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: "Schedule not found" });
      return res.json({ ok: true, schedule: data });
    }

    // Create a new schedule.
    const { flowId, flowName, chain, interval, time, tasks, context } = body;
    if (!Array.isArray(chain) || chain.length === 0) {
      return res.status(400).json({ error: "chain must be a non-empty array" });
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("schedules")
      .insert({
        clerk_user_id: userId,
        flow_id: flowId ?? null,
        flow_name: flowName ?? null,
        chain,
        interval: interval || "daily",
        time: time || "09:00",
        tasks: tasks ?? null,
        context: context ?? null,
        enabled: true,
        next_run: computeNextRun(interval || "daily", time),
        last_run: null,
        created_at: nowIso,
      })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, schedule: data });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
