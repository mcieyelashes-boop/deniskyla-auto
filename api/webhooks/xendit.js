// Xendit webhook receiver. Xendit authenticates callbacks with a static token
// in the `x-callback-token` header (set in the Xendit dashboard) — not an HMAC
// signature — so we compare it against XENDIT_CALLBACK_TOKEN. On a PAID invoice
// we activate the plan for 30 days. external_id encodes the user + plan
// (see api/billing/xendit-checkout.js).
import { setUserPlan } from "../../lib/server/planSync.js";

const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN;

// Parse "sub|<clerkUserId>|<plan>|<ts>" -> { clerkUserId, plan } | null
function parseExternalId(externalId) {
  const parts = String(externalId || "").split("|");
  if (parts[0] !== "sub" || parts.length < 3) return null;
  const clerkUserId = parts[1];
  const plan = parts[2];
  if (!clerkUserId || (plan !== "pro" && plan !== "enterprise")) return null;
  return { clerkUserId, plan };
}

// Constant-time-ish token compare (length-checked equality).
function tokenMatches(provided) {
  if (!XENDIT_CALLBACK_TOKEN || !provided) return false;
  if (provided.length !== XENDIT_CALLBACK_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ XENDIT_CALLBACK_TOKEN.charCodeAt(i);
  }
  return diff === 0;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!XENDIT_CALLBACK_TOKEN) {
    return res.status(501).json({ error: "Billing not configured" });
  }

  const provided = req.headers["x-callback-token"];
  if (!tokenMatches(Array.isArray(provided) ? provided[0] : provided)) {
    return res.status(401).json({ error: "Invalid callback token" });
  }

  const event = req.body || {};
  const status = String(event.status || "").toUpperCase();

  try {
    // Invoice paid -> activate plan for 30 days.
    if (status === "PAID" || status === "SETTLED") {
      const meta = parseExternalId(event.external_id) || {
        clerkUserId: event.metadata?.clerk_user_id,
        plan: event.metadata?.plan,
      };
      if (meta?.clerkUserId && (meta.plan === "pro" || meta.plan === "enterprise")) {
        const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await setUserPlan({
          clerkUserId: meta.clerkUserId,
          plan: meta.plan,
          status: "active",
          currentPeriodEnd: periodEnd,
        });
      }
    }
    // EXPIRED / FAILED invoices need no action (plan simply isn't activated).
  } catch (err) {
    console.error("[xendit webhook] handler error:", err?.message || err);
    // Return 200 so Xendit doesn't hammer retries for a logic error after the
    // token was already validated.
  }

  return res.status(200).json({ received: true });
}
