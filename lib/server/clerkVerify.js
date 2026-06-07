// Verifies a Clerk session token server-side and returns the clerk user id.
// Returns null if not configured or token invalid.
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

export async function verifyClerk(token) {
  if (!token || !CLERK_SECRET_KEY) return null;
  try {
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

// Extract the bearer token from a request and verify it. Returns userId|null.
export async function userFromRequest(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return verifyClerk(token);
}

// Shared CORS helper used by all API routes.
export function applyCors(req, res) {
  const origin = req.headers.origin || "";
  const configured = (process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app")
    .split(",").map((o) => o.trim()).filter(Boolean);
  const staticAllowed = [...configured, "http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
  let ok = !origin || staticAllowed.includes(origin);
  if (!ok && origin) {
    try { ok = new URL(origin).hostname.endsWith(".vercel.app"); } catch { ok = false; }
  }
  if (origin && ok) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-user-api-key, x-cron-secret");
  return ok;
}
