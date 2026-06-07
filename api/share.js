// /api/share — DB-backed persistent share links.
//   POST            → create a share (auth required)
//   GET ?id=...     → fetch a single public share + increment views (NO auth)
//   GET (no id)     → list the authenticated user's own shares (auth required)
//
// RLS is on for the `shares` table; we use the service-role admin client and
// enforce per-user scoping in code (filter by clerk_user_id on the list path).
import { getAdmin, HAS_DB } from "../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../lib/server/clerkVerify.js";

const PUBLIC_URL = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(",")[0].trim()
  : "https://deniskyla-auto.vercel.app";

function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

export default async function handler(req, res) {
  try {
    return await route(req, res);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}

async function route(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: "Forbidden" });
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!HAS_DB) return res.status(501).json({ error: "DB not configured" });
  const admin = getAdmin();
  if (!admin) return res.status(501).json({ error: "DB not configured" });

  // ── POST: create a share (auth required) ──
  if (req.method === "POST") {
    const userId = await userFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { title, flowName, results, runId } = req.body || {};
    if (!results || (Array.isArray(results) && !results.length)) {
      return res.status(400).json({ error: "results required" });
    }

    const id = shortId();
    const row = {
      id,
      clerk_user_id: userId,
      title: title || flowName || "Shared Flow Results",
      flow_name: flowName || null,
      run_id: runId || null,
      results,
      views: 0,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("shares")
      .insert(row)
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });

    const origin = req.headers.origin || PUBLIC_URL;
    return res.json({
      id,
      shareUrl: `${origin}/?share=${id}`,
      share: data,
    });
  }

  // ── GET ──
  if (req.method === "GET") {
    const id = req.query?.id;

    // Public single-share fetch — no auth. Only return public fields.
    if (id) {
      const { data, error } = await admin
        .from("shares")
        .select("id, title, flow_name, results, views, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: "Share not found" });

      // Best-effort view increment (don't fail the read if it errors).
      await admin
        .from("shares")
        .update({ views: (data.views || 0) + 1 })
        .eq("id", id)
        .then(({ error: upErr }) => {
          if (upErr) console.error("[share] view increment failed:", upErr.message);
        });

      return res.json({
        share: { ...data, views: (data.views || 0) + 1 },
      });
    }

    // No id → list the authenticated user's own shares (last 20).
    const userId = await userFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await admin
      .from("shares")
      .select("*")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ shares: data || [] });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
