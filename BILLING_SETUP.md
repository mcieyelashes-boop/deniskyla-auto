# Billing Setup (Stripe)

This app uses **Stripe** for payments. Card processing legally requires a
processor — usage metering and rate limiting are built in-house against
Postgres (Supabase), but anything touching cards goes through Stripe.

All billing code degrades gracefully: if the Stripe env vars are not set, the
billing endpoints return `501 { "error": "Billing not configured" }` instead of
crashing, and the Upgrade modal falls back to the landing pricing page.

---

## 1. Create products & prices in Stripe

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/) → **Products**.
2. Make sure you are in **Test mode** first (toggle, top-right). Repeat in Live
   mode later for production.
3. Create two products with **recurring monthly** prices:
   - **Pro** — e.g. $29 / month
   - **Enterprise** — e.g. $99 / month
4. Copy each price's ID (looks like `price_1AbC...`). You need the **price** ID,
   not the product ID.

| Plan       | Env var                    | Where to find the value           |
| ---------- | -------------------------- | --------------------------------- |
| Pro        | `PRICE_PRO_MONTHLY`        | Pro product → monthly price ID    |
| Enterprise | `PRICE_ENTERPRISE_MONTHLY` | Enterprise product → price ID     |

---

## 2. Get your API keys

Stripe Dashboard → **Developers → API keys**:

- **Secret key** (`sk_test_...` in test mode, `sk_live_...` in live) →
  `STRIPE_SECRET_KEY`
- (Optional) **Publishable key** (`pk_test_...`) → `VITE_STRIPE_PUBLISHABLE_KEY`
  if the frontend ever needs it directly. The current flow does not require it —
  Checkout is created server-side.

---

## 3. Add the webhook endpoint

The webhook keeps the `subscriptions` table and Clerk `publicMetadata.plan` in
sync after a purchase, change, or cancellation.

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL:
   ```
   https://deniskyla-auto.vercel.app/api/webhooks/stripe
   ```
3. Select events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. After creating it, click the endpoint and **reveal the Signing secret**
   (`whsec_...`). That is your `STRIPE_WEBHOOK_SECRET`.

> The webhook reads the **raw** request body (it disables Vercel's JSON parser
> via `export const config = { api: { bodyParser: false } }`) so the Stripe
> signature can be verified. Do not change that.

---

## 4. Set env vars in Vercel

Vercel → Project → **Settings → Environment Variables**. Add (Production +
Preview as needed):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PRICE_PRO_MONTHLY=price_...
PRICE_ENTERPRISE_MONTHLY=price_...
```

These should already exist from earlier phases and must also be present:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
CLERK_SECRET_KEY=sk_...           # used to PATCH Clerk publicMetadata.plan
ALLOWED_ORIGIN=https://deniskyla-auto.vercel.app
```

Redeploy after adding env vars so the serverless functions pick them up.

---

## 5. Test mode vs Live mode

- **Test mode**: keys start with `sk_test_` / `pk_test_`, prices and the webhook
  are separate from live. Use Stripe [test cards](https://stripe.com/docs/testing)
  (e.g. `4242 4242 4242 4242`, any future expiry, any CVC).
- **Live mode**: switch the dashboard toggle, recreate the products/prices and a
  **separate** webhook endpoint (it has its own signing secret), then swap the
  Vercel env vars to the `sk_live_` / live price IDs / live `whsec_`.

Test-mode and live-mode objects never mix — a live secret key cannot read
test-mode customers and vice versa.

---

## 6. Flow overview

1. User clicks **Upgrade** in `UpgradeModal` → `useBilling().startCheckout(plan)`.
2. `POST /api/billing/checkout` verifies the Clerk token, creates/reuses a
   Stripe customer (storing `stripe_customer_id` on the `subscriptions` row and
   `clerk_user_id` in the customer metadata), creates a Checkout Session, and
   returns `{ url }`. The frontend redirects there.
3. On success Stripe redirects back to `/?billing=success` and fires
   `checkout.session.completed` to `/api/webhooks/stripe`.
4. The webhook upserts the `subscriptions` row (plan derived from the price id,
   status, period end, Stripe ids) and PATCHes Clerk
   `publicMetadata.plan` so `usePlan()` reflects the new plan.
5. **Manage billing**: `useBilling().openPortal()` →
   `POST /api/billing/portal` → Stripe Billing Portal session.

---

## 7. (Optional) Atomic rate-limit increment

`lib/server/rateLimit.js` prefers an atomic Postgres function
`increment_rate_limit` if it exists, and falls back to a read-modify-write
otherwise. For higher concurrency, create this function in Supabase
(SQL editor):

```sql
create or replace function increment_rate_limit(
  p_user text,
  p_bucket text,
  p_window_start timestamptz,
  p_units int
) returns int
language plpgsql as $$
declare
  new_count int;
begin
  insert into rate_limits (clerk_user_id, bucket, window_start, count)
  values (p_user, p_bucket, p_window_start, p_units)
  on conflict (clerk_user_id, bucket, window_start)
  do update set count = rate_limits.count + p_units
  returning count into new_count;
  return new_count;
end;
$$;
```
