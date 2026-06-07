# Worker & Cron Notes

## How the queue works

- `POST /api/run` enqueues a `flow_run` + one `jobs` row per agent in the chain.
- `/api/worker` leases up to **5 pending jobs per invocation**, runs each agent
  handler, writes an `agent_outputs` row, and marks the job `done` (or retries
  with backoff, or fails permanently after `max_attempts`).
- When all jobs in a run settle, the worker flips the `flow_run` to `done`
  (all done) or `error` (any permanent failure).

## Vercel Hobby cron limitation (IMPORTANT)

Vercel's **Hobby** plan only allows cron jobs to run at a **daily** granularity.
You cannot schedule `*/1 * * * *` (per-minute) or `0 * * * *` (hourly) on Hobby —
those schedules are rejected at deploy time.

Because of this, `vercel.json` registers `/api/worker` at `0 9 * * *` (once daily).
That is **not** enough for responsive flow execution on its own.

### How we get near-real-time processing anyway

1. **Frontend ping after enqueue.** After the frontend calls `POST /api/run`, it
   should immediately call `POST /api/worker` (with the user's auth token, and
   optionally the `x-user-api-key` header for BYOK). The user can also poll
   `/api/worker` while watching run status to drain remaining jobs. Each call
   processes up to 5 jobs, so a few pings finish a typical chain.
2. **Daily cron as a safety net.** The daily cron drains any stragglers and runs
   the scheduler tick (see below) so scheduled flows still fire without a user
   present.

### Upgrade path

Upgrading to **Vercel Pro** removes the daily-only restriction and allows
per-minute cron (`* * * * *`). At that point, change the `/api/worker` cron
entry in `vercel.json` to `* * * * *` for true background processing and the
frontend ping becomes a latency optimization rather than a requirement.

## Authentication

`/api/worker` accepts either:
- `x-cron-secret: <CRON_SECRET>` header, **or**
- `Authorization: Bearer <CRON_SECRET>` (the header Vercel Cron sends), **or**
- a verified Clerk user (manual "process my jobs now").

Only cron invocations run the **scheduler tick** (enqueue due `schedules`).
Manual user calls only process that user's own jobs.

## BYOK limitation

We never persist a user's Anthropic API key. Background cron invocations
therefore have no BYOK key and fall back to `process.env.ANTHROPIC_API_KEY`.
Only user-triggered manual worker calls can supply a key via the
`x-user-api-key` header, which is forwarded to the agent handler.
