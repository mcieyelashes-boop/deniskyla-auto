# GO LIVE — Production Runbook

This is the precise, click-by-click checklist to take **AgenticOS / Denis Kyla**
from a dev project to a sellable SaaS. Work top to bottom. Each step says exactly
what to set and which env var it maps to.

Two Vercel projects are involved:

| Project    | Repo / dir                | Current URL                       |
| ---------- | ------------------------- | --------------------------------- |
| **App**    | `deniskyla-auto`          | `deniskyla-auto.vercel.app`       |
| **Landing**| `deniskyla-landing`       | `deniskyla-landing.vercel.app`    |

> Env var names below match `.env.example` and `BILLING_SETUP.md`. Set them in
> **Vercel → Project → Settings → Environment Variables** (Production scope),
> then **redeploy** so serverless functions pick them up.

---

## 0. Pre-flight

- [ ] Confirm you have admin access to: Clerk, Supabase, Stripe, Vercel, and the
      DNS provider for your domain.
- [ ] Decide your production domains, e.g. `app.deniskyla.auto` (app) and
      `deniskyla.auto` (landing). Used throughout below.
- [ ] Have a real credit card ready for the live Stripe end-to-end test.

---

## 1. Clerk → Production instance

Dev Clerk keys (`pk_test_` / `sk_test_`) show a dev banner and are not for
production. Create a production instance.

1. **Create production instance**
   - Clerk Dashboard → top-left instance switcher → **Create production instance**
     (or "Go to Production"). Clerk clones your dev configuration.
2. **Add a custom domain + DNS**
   - Clerk → **Domains** → set your production domain (e.g. `app.deniskyla.auto`).
   - Clerk shows **CNAME** records (for `clerk.`, `accounts.`, `clkmail.`, and
     DKIM/`clk._domainkey` entries). Add each record at your DNS provider exactly
     as shown. Wait for Clerk to verify (green checks).
3. **Swap keys in Vercel (BOTH projects where used)**
   - App project: set
     - `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...`
     - `CLERK_SECRET_KEY=sk_live_...`  (used to PATCH `publicMetadata.plan`)
   - Landing project: it links to the app for sign-in/up but does not mount
     Clerk directly. If you ever add a Clerk component to the landing, set
     `VITE_CLERK_PUBLISHABLE_KEY=pk_live_...` there too. Otherwise no Clerk key
     is needed on the landing.
4. **Configure allowed origins / redirect URLs**
   - Clerk → **Paths / Allowed origins**: add your production app origin
     (`https://app.deniskyla.auto`) and the landing origin
     (`https://deniskyla.auto`) so cross-origin sign-in from the landing works.
5. **Enable sign-in methods**
   - Clerk → **User & Authentication** → enable the methods you want live
     (Email/password, Email code, Google OAuth, etc.). Re-check OAuth providers:
     production needs production OAuth credentials, not dev ones.
6. **Remove the dev banner**
   - The "Development mode" banner disappears automatically once you ship the
     `pk_live_` key from the production instance. Verify it's gone after deploy.

---

## 2. Supabase → Paid (Pro) plan

**Why:** the free tier **auto-pauses** after ~1 week of inactivity (cold starts
and failed cron/webhooks), caps at **500 MB** storage, and has tight connection
limits that will throttle your serverless functions. A live SaaS cannot run on it.

1. **Upgrade**
   - Supabase Dashboard → your project → **Settings → Billing / Subscription** →
     upgrade to **Pro**. This removes auto-pause and raises storage/connection
     limits.
2. **Enable backups / PITR**
   - **Settings → Database → Backups**: confirm daily backups, and enable
     **Point-in-Time Recovery (PITR)** for granular restore.
3. **RLS / security model stays the same**
   - The app uses a **header-secret RLS** approach: server endpoints authenticate
     the Clerk JWT, then talk to Postgres. The `anon` JWT + `APP_DB_SECRET`
     pattern (passing the app's shared secret so RLS policies authorize the
     server) is unchanged in production — do **not** loosen RLS. Keep
     `SUPABASE_SERVICE_ROLE_KEY` server-side only (never `VITE_`-prefixed).
4. **Env vars (App project, Production):**
   - `VITE_SUPABASE_URL=https://<proj>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=<anon key>`
   - `SUPABASE_URL=https://<proj>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<service role key>`  (SECRET, bypasses RLS)
   - Keep `APP_DB_SECRET` / `TRIGGER_KEYS` / `CRON_SECRET` set as in dev.
5. (Optional, recommended for concurrency) Create the atomic
   `increment_rate_limit` Postgres function — see `BILLING_SETUP.md` §7.

---

## 3. Stripe → Live mode

Recreate products and the webhook in **Live** mode (test and live objects never
mix). See `BILLING_SETUP.md` for the full flow.

1. **Switch to Live mode** (toggle, top-right of the Stripe Dashboard).
2. **Create Products + recurring prices**
   - **Products → Add product**: "Pro", price **$29.00 / month**, recurring.
   - **Products → Add product**: "Enterprise", price **$99.00 / month**, recurring.
   - Copy each **price** ID (`price_1...`) — the price ID, not the product ID.
3. **Set env vars (App project, Production):**
   - `PRICE_PRO_MONTHLY=price_...`        (live Pro monthly price ID)
   - `PRICE_ENTERPRISE_MONTHLY=price_...` (live Enterprise monthly price ID)
   - `STRIPE_SECRET_KEY=sk_live_...`      (Developers → API keys, Live)
   - (If/when annual is sold) `VITE_PRICE_PRO_ANNUAL=price_...`
   - (Only if the frontend needs it) `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`
4. **Add the live webhook endpoint**
   - Stripe → **Developers → Webhooks → Add endpoint**.
   - URL: `https://app.deniskyla.auto/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Reveal the **Signing secret** (`whsec_...`) →
     `STRIPE_WEBHOOK_SECRET=whsec_...`
   - The webhook handler reads the **raw** body
     (`config = { api: { bodyParser: false } }`) for signature verification — do
     not change that.
5. **Redeploy** the app so functions pick up the new env vars.
6. **Test with a real card**
   - Sign up as a fresh user → click **Upgrade → Pro** → complete Stripe Checkout
     with a real card.
   - Verify: redirect back to `/?billing=success`; the `subscriptions` row is
     upserted; Clerk `publicMetadata.plan` becomes `pro`; the dashboard reflects
     Pro. Then open **Manage billing** (Stripe portal) and confirm cancel works.
   - Refund that test charge in the Stripe Dashboard afterward.

---

## 4. Custom domains on Vercel

1. **App project** → Vercel → **Settings → Domains** → add `app.deniskyla.auto`.
   Add the CNAME/A records Vercel shows at your DNS provider; wait for "Valid".
2. **Landing project** → add `deniskyla.auto` (and `www.` redirect if desired).
3. **Update origin allow-lists everywhere** so the app only accepts its own
   origin:
   - App project env: `ALLOWED_ORIGIN=https://app.deniskyla.auto`
   - Re-check Clerk allowed origins (Step 1.4) include both domains.
4. **Point the landing's auth links at the production app.** In
   `deniskyla-landing/src/App.jsx`, `APP_URL` is currently
   `https://deniskyla-auto.vercel.app` — change it to
   `https://app.deniskyla.auto` (and the Enterprise `SALES_MAILTO` if you move the
   contact address), then redeploy the landing.
5. Update the Stripe webhook URL (Step 3.4) and `BILLING_SETUP.md` references if
   the app domain changed.

---

## 5. Legal pages

1. **Publish the pages.** They live in the landing repo and render at:
   - `https://deniskyla.auto/terms`
   - `https://deniskyla.auto/privacy`
   - `https://deniskyla.auto/refund`
   (Routing is handled in `deniskyla-landing/src/App.jsx` via
   `window.location.pathname`, with SPA rewrites in
   `deniskyla-landing/vercel.json` so deep links resolve to `index.html`.)
2. **Fill in placeholders** in `deniskyla-landing/src/legal/content.js`:
   - `[Your Company Legal Name]` → your registered entity name.
   - `[Jurisdiction]` → governing-law jurisdiction.
   - Contact email — replace the placeholder `hello@deniskyla.auto` with your
     real support/privacy address.
   - The API-key storage paragraph in Privacy §3 — make it match your actual
     implementation.
   - Appoint a DPO / EU representative in Privacy §15 if required.
3. **Have a lawyer review** — each doc is marked TEMPLATE at the top. Remove that
   banner only after legal review.
4. **Link them in signup.** In Clerk's sign-up UI (Clerk → **Customization /
   Legal**), set the **Terms of Service URL** and **Privacy Policy URL** to the
   published pages so users accept them at registration. The landing footer
   already links all three.

---

## 6. Meta / TikTok app review (gates the posting feature)

Automated posting to Instagram and TikTok via their official APIs requires app
review **before** it can work for non-test users. Do this before promising the
social-posting feature publicly.

- [ ] **Business verification** — Meta Business Suite and TikTok for Developers
      both require verifying your business/identity.
- [ ] **Public privacy policy URL** — point them at
      `https://deniskyla.auto/privacy` (must be live and accurate first — Step 5).
- [ ] **Meta (Instagram Graph API):** create an app in Meta for Developers,
      request the relevant permissions (e.g. `instagram_content_publish`,
      `pages_show_list`), provide use-case descriptions + a screencast, and submit
      for **App Review**. Posting works only for app admins/testers until approved.
- [ ] **TikTok (Content Posting API):** register the app, configure scopes,
      provide the privacy URL and demo, and submit for review.
- [ ] Until approved, keep the social-posting feature flagged off or limited to
      test accounts so users aren't shown a broken capability.

---

## 7. Pre-launch checklist

- [ ] **Full happy path:** fresh signup → choose Pro → Stripe Checkout with a
      real card → land back in app → Pro features unlocked → manage/cancel via
      Stripe portal works.
- [ ] **Webhook sync:** `subscriptions` row + Clerk `publicMetadata.plan` update
      correctly on subscribe, update, and cancel.
- [ ] **Rate limits:** verify per-plan rate limiting fires (e.g. exceed a bucket
      and confirm the limit response), and that the atomic increment function is
      in place if you created it.
- [ ] **Data isolation:** create two separate test accounts, generate data in
      each, and confirm neither can read the other's flows/leads (RLS working).
- [ ] **API key safety:** confirm BYOK key is stored as described in Privacy §3,
      never logged in plaintext, and deletable from settings.
- [ ] **Backups on:** Supabase Pro daily backups + PITR confirmed (Step 2.2).
- [ ] **Env hygiene:** no `sk_test_`/`pk_test_`/test price IDs left in Production;
      no secret accidentally `VITE_`-prefixed; `ALLOWED_ORIGIN` set to the prod
      app domain.
- [ ] **Clerk dev banner gone**, custom domains resolve over HTTPS, legal pages
      live and linked at signup.
- [ ] **Monitoring:** check Vercel function logs and Stripe webhook delivery logs
      for errors after the first real transactions.
