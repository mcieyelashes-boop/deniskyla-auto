// Server-side Supabase client.
//
// This project's PostgREST only accepts LEGACY JWT keys (new sb_secret_ keys are
// rejected). Rather than a service_role key, we authenticate with the anon JWT and
// pass a private `x-app-secret` header. RLS policies on every table grant access
// ONLY when that header matches — so the public anon key alone is fully blocked,
// and the server (which holds APP_DB_SECRET) gets full access. Per-user scoping is
// still enforced in the API code via the verified Clerk user id.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// SUPABASE_SERVICE_ROLE_KEY holds the legacy anon JWT (what PostgREST accepts here).
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const APP_DB_SECRET = process.env.APP_DB_SECRET;

let _client = null;

export function getAdmin() {
  if (_client) return _client;
  if (!SUPABASE_URL || !KEY || !APP_DB_SECRET) return null;
  _client = createClient(SUPABASE_URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-app-secret": APP_DB_SECRET } },
  });
  return _client;
}

export const HAS_DB = !!(SUPABASE_URL && KEY && APP_DB_SECRET);
