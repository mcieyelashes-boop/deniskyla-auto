// Fixed-window rate limiter backed by the rate_limits table.
// Resilient: if the DB isn't configured, requests are allowed by default.
import { getAdmin } from "./supabaseAdmin.js";

// Fixed-window limiter.
// window_start = floor(now / windowSec) * windowSec (unix seconds).
// Atomically increments count for (clerkUserId, bucket, window_start).
// Returns { allowed, remaining, resetAt }.
export async function rateLimit({
  clerkUserId,
  bucket,
  max,
  windowSec,
  units = 1,
}) {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStartSec = Math.floor(nowSec / windowSec) * windowSec;
  const windowStartIso = new Date(windowStartSec * 1000).toISOString();
  const resetAt = new Date((windowStartSec + windowSec) * 1000).toISOString();

  const sb = getAdmin();
  if (!sb) {
    console.warn("[rateLimit] DB not configured — allowing by default");
    return { allowed: true, remaining: max, resetAt };
  }

  // Atomic upsert: insert with count=units, or on conflict bump count by units.
  // Supabase JS upsert can't do "count = count + n" directly, so use an RPC if
  // available; otherwise fall back to a read-modify-write that is still safe
  // enough for fixed windows. We prefer an atomic SQL increment via rpc.
  try {
    // Attempt atomic increment through a Postgres function if present.
    const { data: rpcData, error: rpcError } = await sb.rpc(
      "increment_rate_limit",
      {
        p_user: clerkUserId,
        p_bucket: bucket,
        p_window_start: windowStartIso,
        p_units: units,
      }
    );
    if (!rpcError && typeof rpcData === "number") {
      const count = rpcData;
      return {
        allowed: count <= max,
        remaining: Math.max(0, max - count),
        resetAt,
      };
    }
  } catch {
    // fall through to non-atomic path
  }

  // Fallback path: upsert seed row then increment.
  // 1) ensure row exists (ignore conflict)
  await sb
    .from("rate_limits")
    .upsert(
      {
        clerk_user_id: clerkUserId,
        bucket,
        window_start: windowStartIso,
        count: 0,
      },
      { onConflict: "clerk_user_id,bucket,window_start", ignoreDuplicates: true }
    );

  // 2) read current count, write back +units
  const { data: row } = await sb
    .from("rate_limits")
    .select("count")
    .eq("clerk_user_id", clerkUserId)
    .eq("bucket", bucket)
    .eq("window_start", windowStartIso)
    .maybeSingle();

  const current = row?.count ?? 0;
  const next = current + units;

  const { error: updErr } = await sb
    .from("rate_limits")
    .update({ count: next })
    .eq("clerk_user_id", clerkUserId)
    .eq("bucket", bucket)
    .eq("window_start", windowStartIso);

  if (updErr) {
    console.warn("[rateLimit] update error — allowing:", updErr.message);
    return { allowed: true, remaining: max, resetAt };
  }

  return {
    allowed: next <= max,
    remaining: Math.max(0, max - next),
    resetAt,
  };
}
