// Server-side Supabase client using the service role / secret key.
// Bypasses RLS — ONLY use in serverless functions, never shipped to client.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client = null;

export function getAdmin() {
  if (_client) return _client;
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  _client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export const HAS_DB = !!(SUPABASE_URL && SERVICE_KEY);
