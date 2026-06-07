// POST /api/billing/checkout  { plan: 'pro' | 'enterprise' }
// Creates (or reuses) a Stripe customer and opens a Checkout Session.
import Stripe from "stripe";
import { getAdmin } from "../../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../../lib/server/clerkVerify.js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

// Map plan id -> Stripe price id from env.
function priceForPlan(plan) {
  if (plan === "pro") {
    return process.env.PRICE_PRO_MONTHLY || process.env.VITE_PRICE_PRO_MONTHLY;
  }
  if (plan === "enterprise") {
    return (
      process.env.PRICE_ENTERPRISE_MONTHLY ||
      process.env.VITE_PRICE_ENTERPRISE_MONTHLY
    );
  }
  return null;
}

function appOrigin() {
  return (process.env.ALLOWED_ORIGIN || "https://deniskyla-auto.vercel.app")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)[0];
}

export default async function handler(req, res) {
  const corsOk = applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!corsOk) return res.status(403).json({ error: "Forbidden" });
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!STRIPE_SECRET_KEY) {
    return res.status(501).json({ error: "Billing not configured" });
  }

  const userId = await userFromRequest(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { plan } = req.body || {};
  if (plan !== "pro" && plan !== "enterprise") {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const price = priceForPlan(plan);
  if (!price) {
    return res.status(501).json({ error: "Billing not configured" });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const sb = getAdmin();

  try {
    // Reuse existing customer if we have one stored.
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
      const customer = await stripe.customers.create({
        metadata: { clerk_user_id: userId },
      });
      customerId = customer.id;
      // Persist the customer id (best effort) so the webhook + portal can find it.
      if (sb) {
        await sb.from("subscriptions").upsert(
          {
            clerk_user_id: userId,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          },
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
      subscription_data: {
        metadata: { clerk_user_id: userId, plan },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error:", err?.message || err);
    return res.status(500).json({ error: "Checkout failed" });
  }
}
