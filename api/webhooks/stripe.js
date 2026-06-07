// Stripe webhook receiver.
// Verifies the signature against the RAW request body, then syncs the
// subscriptions table and the user's Clerk publicMetadata.plan.
import Stripe from "stripe";
import { getAdmin } from "../../lib/server/supabaseAdmin.js";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

// Vercel parses JSON by default — disable so we can read the raw stream for
// Stripe signature verification.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) =>
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    );
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Map a Stripe price id -> our plan name.
function planForPrice(priceId) {
  const pro =
    process.env.PRICE_PRO_MONTHLY || process.env.VITE_PRICE_PRO_MONTHLY;
  const ent =
    process.env.PRICE_ENTERPRISE_MONTHLY ||
    process.env.VITE_PRICE_ENTERPRISE_MONTHLY;
  if (priceId && priceId === pro) return "pro";
  if (priceId && priceId === ent) return "enterprise";
  return null;
}

// Push plan to Clerk publicMetadata so the frontend usePlan() reflects it.
async function updateClerkPlan(clerkUserId, plan) {
  if (!clerkUserId || !CLERK_SECRET_KEY) return;
  try {
    await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ public_metadata: { plan } }),
    });
  } catch (err) {
    console.warn("[stripe webhook] clerk update failed:", err?.message || err);
  }
}

// Upsert the subscriptions row + sync Clerk.
async function syncSubscription({
  clerkUserId,
  plan,
  status,
  customerId,
  subscriptionId,
  currentPeriodEnd,
}) {
  const sb = getAdmin();
  if (sb && clerkUserId) {
    const row = {
      clerk_user_id: clerkUserId,
      status: status ?? null,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      updated_at: new Date().toISOString(),
    };
    if (plan) row.plan = plan;
    if (currentPeriodEnd) row.current_period_end = currentPeriodEnd;
    const { error } = await sb
      .from("subscriptions")
      .upsert(row, { onConflict: "clerk_user_id" });
    if (error)
      console.warn("[stripe webhook] subscription upsert error:", error.message);
  }
  if (plan) await updateClerkPlan(clerkUserId, plan);
}

// Resolve clerk_user_id from a Stripe customer's metadata.
async function clerkIdFromCustomer(stripe, customerId, fallback) {
  if (fallback) return fallback;
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer?.metadata?.clerk_user_id || null;
  } catch {
    return null;
  }
}

function isoFromUnix(sec) {
  return sec ? new Date(sec * 1000).toISOString() : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return res.status(501).json({ error: "Billing not configured" });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn("[stripe webhook] signature verify failed:", err?.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.object || event.data?.object;
        const session = event.data?.object || s;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const clerkUserId = await clerkIdFromCustomer(
          stripe,
          customerId,
          session.metadata?.clerk_user_id
        );
        // Pull subscription to get price + period.
        let plan = session.metadata?.plan || null;
        let currentPeriodEnd = null;
        let status = "active";
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items?.data?.[0]?.price?.id;
          plan = planForPrice(priceId) || plan;
          currentPeriodEnd = isoFromUnix(sub.current_period_end);
          status = sub.status;
        }
        await syncSubscription({
          clerkUserId,
          plan,
          status,
          customerId,
          subscriptionId,
          currentPeriodEnd,
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = planForPrice(priceId);
        const clerkUserId = await clerkIdFromCustomer(
          stripe,
          customerId,
          sub.metadata?.clerk_user_id
        );
        await syncSubscription({
          clerkUserId,
          plan,
          status: sub.status,
          customerId,
          subscriptionId: sub.id,
          currentPeriodEnd: isoFromUnix(sub.current_period_end),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer;
        const clerkUserId = await clerkIdFromCustomer(
          stripe,
          customerId,
          sub.metadata?.clerk_user_id
        );
        // Downgrade to free.
        await syncSubscription({
          clerkUserId,
          plan: "free",
          status: "canceled",
          customerId,
          subscriptionId: sub.id,
          currentPeriodEnd: isoFromUnix(sub.current_period_end),
        });
        break;
      }

      default:
        // Ignore other events.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err?.message || err);
    // Still return 200 so Stripe doesn't hammer retries for logic errors;
    // signature was already verified.
  }

  return res.status(200).json({ received: true });
}
