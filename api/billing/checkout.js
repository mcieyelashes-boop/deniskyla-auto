// POST /api/billing/checkout  { plan: 'pro' | 'enterprise' }
// Provider-aware: if XENDIT_SECRET_KEY is set, create a Xendit Invoice (covers
// Indonesian local methods + international cards); otherwise fall back to Stripe
// Checkout. Returns { url } in both cases. Consolidated into a single function
// to stay within Vercel's Hobby serverless-function limit.
import Stripe from "stripe";
import { getAdmin } from "../../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../../lib/server/clerkVerify.js";

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

function appOrigin() {
  return (process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)[0];
}

// ── Xendit ──────────────────────────────────────────────────────────────────
// Plan -> price in IDR (whole rupiah). Override via env.
function xenditAmount(plan) {
  if (plan === "pro") return Number(process.env.XENDIT_PRICE_PRO || 99000);
  if (plan === "enterprise") return Number(process.env.XENDIT_PRICE_ENTERPRISE || 299000);
  return 0;
}

// external_id carries the user + plan so the webhook can resolve who paid.
// Format: sub|<clerkUserId>|<plan>|<ts>
export function encodeExternalId(userId, plan) {
  return `sub|${userId}|${plan}|${Date.now()}`;
}

async function handleXendit(res, userId, plan) {
  const amount = xenditAmount(plan);
  if (!amount || amount < 1) return res.status(501).json({ error: "Billing not configured" });
  const origin = appOrigin();
  try {
    const auth = Buffer.from(`${XENDIT_SECRET_KEY}:`).toString("base64");
    const resp = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({
        external_id: encodeExternalId(userId, plan),
        amount,
        currency: "IDR",
        description: `deniskyla.auto — ${plan === "pro" ? "Pro" : "Enterprise"} plan (monthly)`,
        success_redirect_url: `${origin}/?billing=success`,
        failure_redirect_url: `${origin}/?billing=cancel`,
        payment_methods: [
          "CREDIT_CARD", "QRIS", "OVO", "DANA", "SHOPEEPAY", "LINKAJA",
          "BCA", "BNI", "BRI", "MANDIRI", "PERMATA", "ALFAMART", "INDOMARET",
        ],
        metadata: { clerk_user_id: userId, plan },
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.invoice_url) {
      console.error("[checkout/xendit] error:", data?.message || resp.status);
      return res.status(502).json({ error: data?.message || "Checkout failed" });
    }
    return res.status(200).json({ url: data.invoice_url });
  } catch (err) {
    console.error("[checkout/xendit] error:", err?.message || err);
    return res.status(500).json({ error: "Checkout failed" });
  }
}

// ── Stripe ──────────────────────────────────────────────────────────────────
function stripePriceForPlan(plan) {
  if (plan === "pro") return process.env.PRICE_PRO_MONTHLY || process.env.VITE_PRICE_PRO_MONTHLY;
  if (plan === "enterprise")
    return process.env.PRICE_ENTERPRISE_MONTHLY || process.env.VITE_PRICE_ENTERPRISE_MONTHLY;
  return null;
}

async function handleStripe(res, userId, plan) {
  const price = stripePriceForPlan(plan);
  if (!price) return res.status(501).json({ error: "Billing not configured" });
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const sb = getAdmin();
  try {
    let customerId = null;
    if (sb) {
      const { data } = await sb
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("clerk_user_id", userId)
        .maybeSingle();
      customerId = data?.stripe_customer_id || null;
    }
    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { clerk_user_id: userId } });
      customerId = customer.id;
      if (sb) {
        await sb.from("subscriptions").upsert(
          { clerk_user_id: userId, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
          { onConflict: "clerk_user_id" }
        );
      }
    }
    const origin = appOrigin();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancel`,
      metadata: { clerk_user_id: userId, plan },
      subscription_data: { metadata: { clerk_user_id: userId, plan } },
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[checkout/stripe] error:", err?.message || err);
    return res.status(500).json({ error: "Checkout failed" });
  }
}

export default async function handler(req, res) {
  const corsOk = applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: "Forbidden" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const userId = await userFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { plan } = req.body || {};
  if (plan !== "pro" && plan !== "enterprise") {
    return res.status(400).json({ error: "Invalid plan" });
  }

  // Prefer Xendit when configured (Indonesia + international); else Stripe.
  if (XENDIT_SECRET_KEY) return handleXendit(res, userId, plan);
  if (STRIPE_SECRET_KEY) return handleStripe(res, userId, plan);
  return res.status(501).json({ error: "Billing not configured" });
}
