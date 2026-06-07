// POST /api/billing/portal
// Opens a Stripe Billing Portal session for the user's stored customer.
import Stripe from "stripe";
import { getAdmin } from "../../lib/server/supabaseAdmin.js";
import { userFromRequest, applyCors } from "../../lib/server/clerkVerify.js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

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

  const sb = getAdmin();
  if (!sb) {
    return res.status(501).json({ error: "Billing not configured" });
  }

  try {
    const { data } = await sb
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    const customerId = data?.stripe_customer_id;
    if (!customerId) {
      return res.status(404).json({ error: "No billing account found" });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appOrigin()}/?billing=portal`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[portal] error:", err?.message || err);
    return res.status(500).json({ error: "Portal failed" });
  }
}
