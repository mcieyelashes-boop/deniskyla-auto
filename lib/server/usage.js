// Usage metering + plan limit checks (server-side).
// Uses the Supabase admin client (service role) — never import in frontend code.
import { getAdmin } from "./supabaseAdmin.js";

// IMPORTANT: keep in sync with src/config/plans.js (PLANS[id].limits).
// We replicate the limits here instead of cross-importing the frontend ESM
// module, so server bundles don't pull in client config. Infinity -> use the
// JSON-safe sentinel below when comparing (Infinity stays Infinity in JS).
export const PLAN_LIMITS = {
  free: {
    workspaces: 1,
    customAgents: 2,
    flowsPerDay: 10,
    scheduledFlows: 0,
    templates: false,
    integrations: false,
    webhooks: false,
    batchRunner: false,
    apiAccess: false,
    flowVersioning: false,
  },
  pro: {
    workspaces: Infinity,
    customAgents: Infinity,
    flowsPerDay: 500,
    scheduledFlows: 20,
    templates: true,
    integrations: true,
    webhooks: true,
    batchRunner: true,
    apiAccess: false,
    flowVersioning: true,
  },
  enterprise: {
    workspaces: Infinity,
    customAgents: Infinity,
    flowsPerDay: Infinity,
    scheduledFlows: Infinity,
    templates: true,
    integrations: true,
    webhooks: true,
    batchRunner: true,
    apiAccess: true,
    flowVersioning: true,
  },
};

// Start of the current UTC day as an ISO string.
function startOfUtcDay() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

// Insert a usage_events row. Resilient if DB missing.
export async function recordUsage({ clerkUserId, kind, units = 1, meta }) {
  if (!clerkUserId || !kind) return { ok: false, error: "missing args" };
  const sb = getAdmin();
  if (!sb) {
    console.warn("[usage] recordUsage skipped — DB not configured");
    return { ok: false, skipped: true };
  }
  const { error } = await sb.from("usage_events").insert({
    clerk_user_id: clerkUserId,
    kind,
    units,
    meta: meta ?? null,
    created_at: new Date().toISOString(),
  });
  if (error) {
    console.warn("[usage] recordUsage error:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Count total units for a kind since start of the UTC day.
export async function getUsageToday({ clerkUserId, kind }) {
  if (!clerkUserId || !kind) return 0;
  const sb = getAdmin();
  if (!sb) {
    console.warn("[usage] getUsageToday — DB not configured, returning 0");
    return 0;
  }
  const { data, error } = await sb
    .from("usage_events")
    .select("units")
    .eq("clerk_user_id", clerkUserId)
    .eq("kind", kind)
    .gte("created_at", startOfUtcDay());
  if (error) {
    console.warn("[usage] getUsageToday error:", error.message);
    return 0;
  }
  return (data || []).reduce((sum, row) => sum + (row.units || 0), 0);
}

// Read the subscriptions row -> plan id. Defaults to 'free' if none/no DB.
export async function getPlan({ clerkUserId }) {
  if (!clerkUserId) return "free";
  const sb = getAdmin();
  if (!sb) return "free";
  const { data, error } = await sb
    .from("subscriptions")
    .select("plan, status")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (error) {
    console.warn("[usage] getPlan error:", error.message);
    return "free";
  }
  const plan = data?.plan;
  if (plan && PLAN_LIMITS[plan]) return plan;
  return "free";
}

// Check a feature limit for a user.
// Returns { allowed, limit, plan }.
// - boolean features: allowed = limit (the feature flag).
// - numeric features: allowed = current < limit (Infinity always allowed).
export async function checkLimit({ clerkUserId, feature, current = 0 }) {
  const plan = await getPlan({ clerkUserId });
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const limit = limits[feature];

  if (typeof limit === "boolean") {
    return { allowed: limit, limit, plan };
  }
  if (typeof limit === "number") {
    if (limit === Infinity) return { allowed: true, limit, plan };
    return { allowed: current < limit, limit, plan };
  }
  // Unknown feature -> deny safe
  return { allowed: false, limit: undefined, plan };
}
