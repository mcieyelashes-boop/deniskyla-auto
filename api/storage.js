import { getAdmin, HAS_DB } from "../lib/server/supabaseAdmin.js";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

function cors(req, res) {
  const origin = req.headers.origin || "";
  const allowed = [
    process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
  ];
  const ok = !origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin);
  if (origin && ok) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
  return ok;
}

// Verify Clerk session token -> returns clerk user id, or null
async function verifyClerk(token) {
  if (!token || !CLERK_SECRET_KEY) return null;
  try {
    // Use Clerk backend API to verify the session token
    const resp = await fetch("https://api.clerk.com/v1/sessions/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.user_id || data?.userId || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (!cors(req, res)) return res.status(403).json({ error: "Forbidden" });
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!HAS_DB) {
    return res.status(501).json({ error: "Cloud storage not configured" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const userId = await verifyClerk(token);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const sb = getAdmin();
  if (!sb) return res.status(501).json({ error: "Cloud storage not configured" });

  if (req.method === "GET") {
    const key = req.query.key;
    if (key) {
      const { data, error } = await sb
        .from("user_data")
        .select("data")
        .eq("clerk_user_id", userId)
        .eq("key", key)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ data: data?.data ?? null });
    }
    // Return all keys for this user
    const { data, error } = await sb
      .from("user_data")
      .select("key, data")
      .eq("clerk_user_id", userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: data || [] });
  }

  if (req.method === "POST") {
    const { key, data } = req.body || {};
    if (!key) return res.status(400).json({ error: "key required" });
    const { error } = await sb.from("user_data").upsert(
      { clerk_user_id: userId, key, data, updated_at: new Date().toISOString() },
      { onConflict: "clerk_user_id,key" }
    );
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
