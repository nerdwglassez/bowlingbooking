# Production deployment runbook

Operational steps to take **royalz-lanes** from a fresh `git clone` to **live bookings on a custom domain**. Assumes a Unix-like shell and Node **20+** (see `package.json` `engines` is not pinned; devDependencies target `@types/node` 20).

---

## 1. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | Install via your platform or `nvm`. |
| **PostgreSQL** | Managed Postgres (e.g. **Neon**) is fine. You need a single `DATABASE_URL` connection string. Typical Neon shape: `postgresql://USER:PASSWORD@HOST/DB?sslmode=require` (query params vary; `sslmode=require` is common). |
| **Stripe** | One account with **test** and **live** keys as needed. Live mode for production charges. |
| **Resend** | Account with a **verified sending domain** (DNS for SPF, DKIM, and return-path as Resend instructs). |
| **DNS** | Control of the **app hostname** (A/CNAME/ALIAS to your host) and the **mail domain** records Resend requires. |

---

## 2. Environment variables

Set secrets in the host’s env UI or a managed secret store — **never** commit `.env.local`.

### Dev fallbacks vs production

| Mechanism | When it applies | Behavior |
|-----------|------------------|------------|
| `isDevWithoutDb()` | `NODE_ENV !== 'production'` **and** `DATABASE_URL` missing or not a real URL (`src/lib/env.ts`) | Mock tenant (`getTenant`), mock booking actions (`acquireBookingHold`, slots, `confirmBooking` client secret, etc.). **Always `false` in production** — production requires a real `DATABASE_URL`. |
| Stripe without `STRIPE_SECRET_KEY` | `getStripe()` is `null` | `createPaymentIntent` / `createRefund` return **mock** IDs and secrets (`src/lib/stripe.ts`). This happens **whenever the secret is unset**, including if `NODE_ENV === 'production'` — **set `STRIPE_SECRET_KEY` in production** or customers cannot pay for real. |
| `constructWebhookEvent` | Production | If the Stripe client or `STRIPE_WEBHOOK_SECRET` is missing, verification **throws** (no unsigned JSON path). |
| Non-production webhook | `STRIPE_WEBHOOK_SECRET` unset and/or no usable Stripe client | If `Stripe-Signature` is **absent**, handler gets `null` event → **400**. If the header is **present**, raw body is parsed as JSON (tests / local tooling). |
| Resend without `RESEND_API_KEY` | `resolveResend()` returns `null` | `sendBookingConfirmation` / `sendBookingCancellation` log **`[email-mock]`** to the server console and return `{ id: null }` (`src/lib/email.ts`). In production, missing key still hits this path — **set `RESEND_API_KEY`** for real delivery. |
| Auth secret | `NODE_ENV !== 'production'` and no `AUTH_SECRET` / `NEXTAUTH_SECRET` | Hard-coded **dev-only** fallback secret (`src/lib/auth.ts`). **Never used when `NODE_ENV === 'production'`** — production **must** set `AUTH_SECRET` or `NEXTAUTH_SECRET`. |

**Operational rule:** Treat production as requiring real `DATABASE_URL`, `AUTH_SECRET` (or `NEXTAUTH_SECRET`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, and URL vars below. Do not rely on dev shortcuts.

### Annotated table (every variable in `.env.example`)

| Var | Required in production? | What it does | How to get the value | If unset (dev / test) |
|-----|-------------------------|--------------|------------------------|------------------------|
| `DATABASE_URL` | **Y** | Prisma connection string to Postgres. | Neon (or host) dashboard → connection string. | If missing/invalid URL and `NODE_ENV !== 'production'`: **`isDevWithoutDb()`** — mock tenant + mock booking flow; auth still needs a real DB to sign in. |
| `DEFAULT_TENANT_SLUG` | **Y** (recommended) | Slug of the `Tenant` row this deployment serves (`src/lib/tenant.ts`). | Must match seeded tenant (`prisma/seed.ts` uses `royalz`). | Warns once; defaults to **`royalz`**. |
| `AUTH_SECRET` | **Y** | Auth.js signing secret for JWT sessions. | `npx auth secret` or a long random string. | With `NODE_ENV !== 'production'`: **dev fallback constant** (insecure). Production: resolver returns `undefined` — session/crypto must not run without this. |
| `NEXTAUTH_SECRET` | **Y** if `AUTH_SECRET` unset | Same as `AUTH_SECRET`; read as fallback (`src/lib/auth.ts`). | Same as above. | Same as `AUTH_SECRET`. |
| `NEXTAUTH_URL` | **Y** (canonical URL) | Convention for Auth.js / NextAuth **public site URL** (in `.env.example`; not referenced in app TS — framework may read `process.env`). | Set to `https://your-domain.com` in prod. | Local default in example file. |
| `AUTH_URL` | **Y** (canonical URL) | Same class as `NEXTAUTH_URL` for Auth.js v5. | Same as `NEXTAUTH_URL`. | Local default in example. |
| `SEED_ADMIN_EMAIL` | **N** for runtime | Admin email used **only** by `prisma/seed.ts` when upserting the seed user. | Your chosen bootstrap admin email. | Seed defaults to **`admin@royalz.local`**. |
| `SEED_ADMIN_PASSWORD` | **N** for runtime; **Y** before seed in shared env | Plaintext password hashed into seed admin user. | Strong password you choose. | Seed uses placeholder **`change-me-please`** and prints a **warning** — unsafe for shared/staging/prod seed runs. |
| `STRIPE_SECRET_KEY` | **Y** | Server-side Stripe SDK (`sk_live_…` / `sk_test_…`). | Stripe Dashboard → API keys. | **`createPaymentIntent` / `createRefund` return mocks**; webhook verification path degrades per `constructWebhookEvent`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Y** for real Elements | Browser Stripe.js (`src/lib/stripe-client.ts`). | Stripe Dashboard → publishable key matching secret mode. | **`getStripeClient()` resolves to `null`** — payment step uses client mock branch. |
| `STRIPE_WEBHOOK_SECRET` | **Y** | `whsec_…` for `Stripe-Signature` verification (`constructWebhookEvent`). | Stripe Dashboard → Webhooks → endpoint signing secret; or `stripe listen` output locally. | Non-prod: unsigned path only if signature header present; missing header → **400** `no-event`. Prod: missing client/secret → **throws** on POST. |
| `RESEND_API_KEY` | **Y** | Resend API (`re_…`). | Resend dashboard → API keys. | **`[email-mock]`** console logging; no send. |
| `RESEND_FROM_EMAIL` | **N** (optional if default acceptable) | Overrides From header for Resend sends. | Verified domain identity, e.g. `Royal Z Lanes <bookings@yourdomain.com>`. | Defaults to **`Royal Z Lanes <bookings@royalz.local>`** (`src/lib/email.ts`) — not viable for production deliverability until domain verified / overridden. |
| `NEXT_PUBLIC_APP_URL` | **Y** | Public base URL for email “manage” links and similar (`src/app/api/webhooks/stripe/route.ts` builds `/find-my-booking/...`). | `https://your-domain.com` (no trailing slash inconsistency trimmed in code). | Falls back to **`http://localhost:3000`** in webhook URL builder only when unset. |

---

## 3. Initial deployment

1. **Clone and install**

```bash
git clone <YOUR_REPO_URL> royalz-lanes
cd royalz-lanes
npm ci
```

2. **Provision Postgres** and set `DATABASE_URL` in the deployment environment (see §1 for URL shape).

   **Schema changes:** When `prisma/schema.prisma` gains new models (e.g. promo codes), generate SQL on a dev machine with a real database, commit the folder, then deploy:

   ```bash
   # Prisma CLI reads `.env` by default; Next.js reads `.env.local`. Either copy
   # DATABASE_URL into `.env`, or load local env first:
   set -a && source .env.local && set +a
   npx prisma migrate dev --name add-promo-codes
   ```

   (Use a descriptive `--name` per change.) Commit `prisma/migrations/`. Staging/production still run **`npx prisma migrate deploy`** only — never `migrate dev` on prod.

   **Wrong schema on the database:** If `migrate dev` reports drift from tables like `discount_codes` / `settings`, the `DATABASE_URL` points at a **non–royalz-lanes** database (e.g. an old prototype). Use a **fresh Neon branch/database** for this app, or run `npx prisma migrate reset` on a **dev-only** database (destroys all data). Initial baseline migration: `prisma/migrations/20260522120000_init_royalz_lanes/`.

3. **Apply migrations** (production — **never** `migrate dev` on prod):

```bash
npx prisma migrate deploy
```

4. **Set seed credentials** in the environment (or inline for a one-off):

```bash
export SEED_ADMIN_EMAIL="you@yourdomain.com"
export SEED_ADMIN_PASSWORD="<strong-one-time-password>"
```

5. **Seed tenant + admin + baseline data**

```bash
npx prisma db seed
```

(`package.json` → `"seed": "tsx prisma/seed.ts"`.) This upserts tenant slug **`royalz`**, lanes, hours, packages, and **upserts** the admin user (email from `SEED_ADMIN_EMAIL`, role `ADMIN`, bcrypt hash from `SEED_ADMIN_PASSWORD`).

6. **Set `DEFAULT_TENANT_SLUG`** to match the seeded slug (default **`royalz`**) unless you changed the seed.

7. **Configure remaining env vars** (§2): `AUTH_SECRET`, URLs, Stripe, Resend, `NEXT_PUBLIC_APP_URL`, publishable Stripe key.

8. **Build and start**

```bash
npm run build
npm run start
```

(On Vercel/similar, the platform runs `build` / `start` for you; ensure env vars are set on the project.)

9. **DNS + TLS** — Point the production hostname at the host; enable HTTPS.

10. **Verify sign-in** — Open `https://{your-domain}/admin` (or `/signin?from=/admin`). You should be redirected to `/signin` when logged out; after signing in with the seeded admin, you should reach **`/admin`** (layout requires `MANAGER` or `ADMIN`; seeded role is `ADMIN`).

---

## 4. Stripe webhook setup

- **Live endpoint URL:** `https://{your-domain}/api/webhooks/stripe`
- **Events to send** (only types handled in `src/app/api/webhooks/stripe/route.ts`):
  - `payment_intent.succeeded`
  - `charge.refunded`
- **Signing secret:** After creating the endpoint, copy **`whsec_…`** into `STRIPE_WEBHOOK_SECRET`.

**Local forwarding:**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Paste the printed `whsec_…` into local env.

**Webhook responsibilities (authoritative):**

- **`payment_intent.succeeded`** — Inserts `StripeEvent`, then creates **`Booking`** + **`Payment`**, deletes matching **`BookingHold`**, sends confirmation email. This is the **only** code path that creates a confirmed **`Booking`** from online payment.
- **`charge.refunded`** — Updates **`Payment.refundAmount`**, **`refundStatus`** (`SUCCEEDED` / `FAILED`), **`refundedAt`**; on full success sets **`Booking.isRefunded`**, **`Booking.status = CANCELLED`**.

The refund **server action** only sets **`Payment.refundStatus = PENDING`**; final success is **webhook-only** (see `.claude/contracts/PAYMENTS.md`).

**Idempotency:** Each event `id` is inserted into **`StripeEvent`**. A unique conflict (**`P2002`**) means the event was already processed — handler returns **200** with `{ duplicate: true }` and **does not** repeat side effects.

**Dev without DB:** If `isDevWithoutDb()` is true, POST returns early with `{ received: true, mocked: true }` and **writes nothing** — irrelevant for production.

---

## 5. Resend setup

1. In Resend, **add the sending domain** and complete verification.
2. Add **SPF**, **DKIM**, and **return-path** DNS records exactly as Resend shows.
3. Create an API key; set **`RESEND_API_KEY`** (`re_…`).
4. Set **`RESEND_FROM_EMAIL`** to a From string on the verified domain, e.g. `Royal Z Lanes <bookings@yourdomain.com>`.
5. **Test:** Complete a booking in test mode; open Resend → **Emails** and confirm the message left the provider. If status is delivered but the inbox is empty, check **spam** and DNS health in Resend.

---

## 6. Smoke test checklist (production-mode)

Use Stripe **test** mode keys on a staging hostname first if possible; same steps apply with **live** keys on production.

1. Visit **`/`** — booking step 1 should render; venue name should match **`Tenant.name`** in the DB (via `getTenant()`), not hardcoded copy.
2. Visit **`/signin?from=/admin`** (or open **`/admin`** first, then sign in). Sign in as the seeded admin → you should land on **`/admin`** with the admin shell.
3. While signed in as that admin, open **`/staff`** — **`requireRole('STAFF','MANAGER','ADMIN')`** allows **`ADMIN`**; you should see the staff cockpit.
4. Complete a **test booking** using card **`4242 4242 4242 4242`** (any future expiry, any CVC).
5. **Promo code E2E:** In **`/admin/promos`**, create an active promo; run checkout again and apply the code on the confirm step; confirm Stripe charged the discounted amount and the booking row shows **`discount_amount`** (and **`promo_code_id`** when the code was still valid when the webhook ran).
6. In Stripe Dashboard → **Developers → Events**, confirm **`payment_intent.succeeded`** delivered **200** to your endpoint; check app logs for `[stripe-webhook]` lines on failure.
7. Confirm the **booking confirmation email** arrived (inbox or Resend dashboard).
8. Open **`/staff/bookings/[id]`** for that booking (navigate from staff UI). As **`MANAGER`** or **`ADMIN`** (seeded admin qualifies), issue a **refund**. UI should show refund **pending** first.
9. Confirm **`charge.refunded`** webhook fired and **`Payment.refundStatus`** moved to **`SUCCEEDED`** (and booking cancelled / refunded flags per webhook).
10. Visit **`/find-my-booking`**, enter the **confirmation code** and **customer email** from the booking.
11. Confirm the booking detail loads and **cancel** is available when policy allows.
12. Create a **second** test booking; use **`/find-my-booking`** to **cancel** that one (leave the refunded booking alone).
13. Confirm **cancellation email** in Resend/inbox; if a refund applies, Stripe refund + **`charge.refunded`** should move status from **pending** to **succeeded** as in step 9.

**Lookup rules:** Email is compared **case-insensitively** (normalized to lowercase); confirmation code is normalized to **uppercase** for the DB match (`src/lib/actions/customer.ts`).

---

## 7. Operational runbook (when something breaks)

### Stripe webhook is failing

- **Signature mismatch:** Wrong **`STRIPE_WEBHOOK_SECRET`** (live vs test mixed, rotated secret not updated, or multiple endpoints). **Clock skew** is rare with Stripe but if TLS/time is wrong on the host, fix NTP.
- **Diagnose:** Stripe Dashboard → **Developers → Events** → open the failing event → **Resend** or **Logs** for HTTP status and response body. App returns **400** `invalid-signature` on verification throw (`route.ts`).

### Payment succeeded in Stripe but no `Booking` row

- **Cause:** Webhook not delivered, returned **5xx**, or **`payment_intent.succeeded`** ran before DB/migrations ready.
- **Fix:** Fix config; from Stripe event details, **Resend** the event. **`StripeEvent`** idempotency means a duplicate Stripe delivery short-circuits safely; if you manually replay, ensure you understand DB state (do not double-book).

### Email not arriving

- Resend → **Emails**: bounced vs delivered vs delayed.
- If **delivered** but invisible: spam folder; recipient rules; verify **SPF/DKIM** green in Resend.
- If **`[email-mock]`** in logs: **`RESEND_API_KEY`** missing or wrong env.

### Customer cannot find booking on `/find-my-booking`

- **Both** confirmation code **and** email must match stored values; email is **case-insensitive**; code matching uses uppercase normalization on lookup.
- If still wrong: query **`Booking`** in Postgres by **`customerEmail`** / **`confirmationCode`** (watch for legacy casing on email — lookup includes an `OR` on trimmed original email).

### “Refund pending” stuck (> ~10 minutes)

- Webhook missed or failed **`charge.refunded`**. **Resend** the event from Stripe. Refund action refuses a second refund while **`refundStatus === PENDING`** (`src/lib/actions/refund.ts`).

### Admin password unknown / locked out

- Set new **`SEED_ADMIN_PASSWORD`** (and optionally **`SEED_ADMIN_EMAIL`**) and run **`npx prisma db seed`** again. Seed **upserts** the user and replaces **`passwordHash`**.

---

## 8. Sentry / error monitoring

Sentry is wired (Phase 11). Without a DSN, the observability wrapper is a console-logging no-op and production emits a one-shot warning.

### Setup

1. Create a Sentry project at https://sentry.io. Pick "Next.js" as the platform.
2. Copy the **DSN** from Project Settings → Client Keys. Set `NEXT_PUBLIC_SENTRY_DSN` in the production environment.
3. (Optional, recommended) For readable stack traces, generate an internal-integration auth token with the `project:releases` scope at https://sentry.io/settings/account/api/auth-tokens/. Set in CI only:
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ORG` (slug)
   - `SENTRY_PROJECT` (slug)
4. Verify locally by setting `NEXT_PUBLIC_SENTRY_DSN` in `.env.local`, then trigger an error (e.g. visit `/api/bookings/x/ics?email=y` and check Sentry's Issues page).

### Code conventions

- **Application code** imports `captureException` / `captureMessage` / `withObservability` from `@/lib/observability` — never `@sentry/nextjs` directly. The drift sentinel enforces this.
- **SDK init files** (`sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`, `instrumentation.ts`) are the only places that may import the Sentry SDK directly.
- **`app/global-error.tsx`** captures unhandled client React errors via the wrapper.

### Tuning

- **Performance traces:** in **production**, `tracesSampleRate` defaults to **0.1** via `getSentryTracesSampleRate()` in `src/lib/env.ts`. Override with `SENTRY_TRACES_SAMPLE_RATE` (0–1). Dev/staging stay at **0**.
- Session Replay is **off**. Turn on in `instrumentation-client.ts` after reviewing the privacy implications (replays capture user input).

---

## 8b. Edge security (rate limits)

Public surfaces (no login) are brute-forceable: booking lookup (email + code), `.ics` download, promo validation.

### Required in production

Configure **WAF / reverse-proxy** limits in front of the app. Starting points (per client IP, per minute):

| Path / behavior | Suggested limit |
|-----------------|-----------------|
| `/find-my-booking` (pages + server actions) | 30 |
| `/api/bookings/*/ics` | 20 |
| Promo validate (server action traffic to `/book/*`) | 40 |

Record your provider’s actual rules here when deployed (Cloudflare rate rule IDs, Vercel Firewall, etc.).

### In-app backstop (M12-M1)

`src/proxy.ts` and server actions use `src/lib/rate-limit.ts` with the same default caps. Enabled in **production** automatically; disabled in **test**; in **local dev** set `RATE_LIMIT_ENABLED=true` in `.env.local` to exercise.

Env vars: see `.env.example` (`RATE_LIMIT_*`, `SENTRY_TRACES_SAMPLE_RATE`). Contract: `.claude/contracts/OPS.md`.

**Serverless caveat:** in-memory limits are per instance — edge limits remain authoritative.

## 9. Known gaps (Phase 12+)
- **No customer accounts** — lookup is **confirmation code + email** only.
- **Reports** — `/admin/reports` (ADMIN-only KPIs + charts). Deferred: CSV export, timezone-correct buckets, MANAGER access.
- **Booking policy** — editable on `/admin/venue` (`cancellationWindowHours`, `cancellationRefundPercent`, `holdTimeoutMins`, `maxOnlineBowlers`). Deferred: advance-booking window, deposit %, other `Tenant.config` knobs.
- **No partial-refund stacking** — while **`refundStatus === PENDING`**, further refunds are rejected until the webhook settles.
- **No booking modification / reschedule** — customers can cancel but not change times.

---

## 10. Backup and recovery

- **Postgres:** Use your provider’s **automated backups** and **point-in-time recovery** (Neon supports PITR on paid tiers — enable per vendor docs).
- **Application state:** All durable state lives in **Postgres** (bookings, payments, holds, `StripeEvent`, users, tenant, **`AuditLog`**). No separate app-owned object store for core booking data.
- **`AuditLog`:** Append-only-style usage for **forensics** (e.g. refund requests) — include in backup scope and access controls.

---

## Scripts reference

From `package.json`:

```bash
npm run verify   # tsc --noEmit + eslint + drift-check + vitest
npm run build    # next build --turbopack
npm run start    # next start
```

---

## Related contracts

- `.claude/contracts/PAYMENTS.md` — Stripe, webhook, refund ownership.
- `.claude/contracts/AUTH.md` — roles, `requireRole`, session rules.
- `.claude/contracts/OPS.md` — edge rate limits, in-app buckets, Sentry trace sampling.
