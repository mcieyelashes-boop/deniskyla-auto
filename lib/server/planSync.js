// Provider-agnostic plan sync: writes the subscriptions table and pushes the
// plan to Clerk publicMetadata so the frontend usePlan() reflects it. Used by
// both the Stripe and Xendit webhooks.
import { getAdmin } from "./supabaseAdmin.js";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

// Push plan -> Clerk publicMetadata.plan. Best-effort; never throws.
export async function updateClerkPlan(clerkUserId, plan) {
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
    console.warn("[planSync] clerk update failed:", err?.message || err);
  }
}

// Upsert the subscriptions row + sync Clerk. `extra` lets a provider stash its
// own ids (e.g. { stripe_customer_id } or { xendit_external_id }).
export async function setUserPlan({
  clerkUserId,
  plan,
  status,
  currentPeriodEnd,
  extra = {},
}) {
  const sb = getAdmin();
  if (sb && clerkUserId) {
    const row = {
      clerk_user_id: clerkUserId,
      status: status ?? null,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    if (plan) row.plan = plan;
    if (currentPeriodEnd) row.current_period_end = currentPeriodEnd;
    const { error } = await sb
      .from("subscriptions")
      .upsert(row, { onConflict: "clerk_user_id" });
    if (error) console.warn("[planSync] subscription upsert error:", error.message);
  }
  if (plan) await updateClerkPlan(clerkUserId, plan);
}
