-- Per-user key/value cloud storage, scoped by Clerk user id.
--
-- Identity is verified server-side in /api/storage using CLERK_SECRET_KEY, and
-- all reads/writes go through the Supabase SERVICE ROLE key (server-only), which
-- bypasses RLS. The API enforces per-user scoping via clerk_user_id, so RLS is
-- intentionally not required for this MVP table.

create table if not exists public.user_data (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  key text not null,
  data jsonb,
  updated_at timestamptz default now(),
  unique (clerk_user_id, key)
);

create index if not exists user_data_user_idx on public.user_data (clerk_user_id);
