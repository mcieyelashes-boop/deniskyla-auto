// Supabase client setup — configured via env vars, gracefully disabled if not set.
//
// Install:  npm install @supabase/supabase-js
// Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
//
// This is an ES module project (Vite), so we use a static import of
// @supabase/supabase-js wrapped in try/catch rather than require(). If the
// package is not installed (or env vars are missing) every consumer falls back
// to localStorage — nothing throws. Run `npm install @supabase/supabase-js`
// before relying on cloud sync.

import { createClient } from "@supabase/supabase-js";

let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("Supabase not configured — using localStorage fallback");
    return null;
  }

  try {
    supabase = createClient(url, key);
    return supabase;
  } catch (e) {
    // createClient is undefined if @supabase/supabase-js failed to resolve,
    // or throws on a malformed URL/key.
    console.warn("@supabase/supabase-js not installed or failed to init:", e?.message || e);
    return null;
  }
}

export const HAS_SUPABASE = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);
