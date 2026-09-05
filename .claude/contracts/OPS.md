# Ops contract (Phase 12 M12-M1)

Status: locked for public-surface abuse resistance and production observability tuning.

## Edge rate limiting (defense in depth)

### Primary: WAF / reverse proxy

Production **must** configure rate limits at the edge (Cloudflare, Vercel Firewall, nginx `limit_req`, etc.) for:

| Surface | Suggested edge limit (starting point) |
|---------|-------------------------------------|
| `GET/POST /find-my-booking` and subpaths | 30 req/min/IP |
| `GET /api/bookings/*/ics` | 20 req/min/IP |
| Server Action posts that hit booking pages (promo validate) | 40 req/min/IP |

Tune per traffic. Document actual limits in `docs/RUNBOOK.md` § Edge security.

### Secondary: in-app backstop (`src/lib/rate-limit.ts`)

- **Enabled** when `NODE_ENV === 'production'` unless `RATE_LIMIT_ENABLED=false`.
- **Disabled** in Vitest (`NODE_ENV=test`).
- **Dev** off unless `RATE_LIMIT_ENABLED=true` (for manual QA).
- **Storage:** in-memory fixed window per process — best-effort on serverless (each instance has its own bucket). Not a substitute for edge limits.

### Buckets

| Bucket | Enforced in | Default (60s window) |
|--------|-------------|----------------------|
| `find_booking` | `src/proxy.ts` (page navigations), `getBookingByLookup` | 30 |
| `booking_ics` | `src/proxy.ts`, `GET …/ics` route | 20 |
| `promo_validate` | `validatePromoCode` | 40 |

### Env vars (read only via `src/lib/env.ts`)

| Var | Purpose |
|-----|---------|
| `RATE_LIMIT_ENABLED` | `true` / `false` override |
| `RATE_LIMIT_WINDOW_SEC` | Window length (default 60) |
| `RATE_LIMIT_FIND_BOOKING_MAX` | `find_booking` cap |
| `RATE_LIMIT_BOOKING_ICS_MAX` | `booking_ics` cap |
| `RATE_LIMIT_PROMO_VALIDATE_MAX` | `promo_validate` cap |

### Response contract

- **Proxy / API:** HTTP **429** with `Retry-After` (seconds) and JSON `{ error: 'Too many requests' }` or plain text for `.ics`.
- **Server actions:** throw `RateLimitExceededError` with a user-safe message (same copy as other booking errors).

### Drift rules

- Rate-limit policy and env parsing live in **`src/lib/env.ts`** and **`src/lib/rate-limit.ts`** only.
- **`src/proxy.ts`** may call `checkRateLimit` — no inline env parsing.
- Do not add rate limits inside page components or patterns.

## Sentry performance traces

- **`getSentryTracesSampleRate()`** / **`getSentryStaffTracesSampleRate()`** in `src/lib/env.ts` are the only places that decide sample rates.
- **Default (customer / untagged):** production `0.2`; development `1.0`; test `0`. Override with `SENTRY_TRACES_SAMPLE_RATE` (0–1).
- **Staff / admin:** default `1.0` (low-volume employee app). Override with `SENTRY_STAFF_TRACES_SAMPLE_RATE` (0–1).
- SDK init files (`sentry.*.config.ts`, `instrumentation-client.ts`) import those helpers via `src/lib/sentry-runtime-options.ts` — no inline rates.
- Staff traffic is tagged `app=staff` / `surface=staff` (path + `StaffObservabilityScope`). Filter Insights with `app:staff`.

Session Replay remains **off** until a separate privacy review.

## Tests

- `src/lib/rate-limit.test.ts` — bucket mapping, window cap, error type.
- `src/lib/env.rate-limit.test.ts` — enable flags and Sentry rate helper.
