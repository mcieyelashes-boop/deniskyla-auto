# Cloud Sync Setup

By default, deniskyla-auto stores all user data in `localStorage` (per-browser).
Enabling cloud sync lets a signed-in user see their data on any device. Without
the environment variables below, the app keeps working exactly as before using
localStorage — cloud sync is fully optional.

## How it works

- `/api/storage` is a serverless route that verifies the Clerk session
  server-side (using `CLERK_SECRET_KEY`) and reads/writes Supabase using the
  **service role** key. The service role key is server-only and never exposed to
  the browser.
- The `useCloudStorage(key, default)` hook behaves like `useState`, but mirrors
  every write to localStorage (fast offline cache + fallback) and syncs to
  `/api/storage` when the user is signed in.

## Steps to activate

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run `supabase/migrations/002_user_data.sql` in the Supabase SQL editor.
3. Add these Vercel environment variables (Project Settings → Environment Variables):
   - `SUPABASE_URL` — your project URL (Settings → API → Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** key (Settings → API).
     Keep this secret; it bypasses Row Level Security.
   - `CLERK_SECRET_KEY` — already set if Clerk auth is configured.
4. Redeploy.
5. Cloud sync activates automatically. Without these vars, the app uses
   localStorage and behaves exactly as before.

## Security notes

- The service role key bypasses RLS, so it must never be `VITE_`-prefixed or sent
  to the client. It lives only in serverless env vars.
- Per-user data isolation is enforced in `/api/storage` by scoping every query to
  the verified `clerk_user_id` from the Clerk session.
