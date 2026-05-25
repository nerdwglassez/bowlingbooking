# Payments Contract

Source of truth for **every file that touches Stripe, BookingHold, Booking creation, or refunds**. Agents working on the booking flow, the webhook handler, refund tooling, or admin booking management MUST read this file before writing code.

The Stripe wrapper (`src/lib/stripe.ts`) is the **only** place that imports `stripe`. The email wrapper (`src/lib/email.ts`) is the only place that imports `resend`. The drift sentinel enforces both with explicit checks.

> The confirmation email now also includes a "View or cancel booking" link to `/find-my-booking/[code]?email=…` and an "Add to calendar" link to `/api/bookings/[code]/ics?email=…`. The .ics endpoint is a public route that requires the email query string as anti-enumeration auth (same model as `/find-my-booking`).

---

## 1. What lives where

| Concern | Module | Notes |
|---|---|---|
| Stripe SDK client + PaymentIntent + Refund | `src/lib/stripe.ts` | Singleton. Exposes `createPaymentIntent`, `createRefund`, `constructWebhookEvent`, `isStripeMocked`, and re-exports `Stripe` types. |
| Outbound email + QR rendering | `src/lib/email.ts` | Singleton Resend client + `sendBookingConfirmation` (manage link + optional .ics link). |
| Booking calendar (.ics) | `src/app/api/bookings/[code]/ics/route.ts` | `GET` with `email` query; delegates lookup to `getBookingByLookup`. |
| Hold acquisition / release / availability | `src/lib/actions/booking.ts` | `acquireBookingHold`, `releaseBookingHold`, `getAvailableTimeSlots`, `confirmBooking`. |
| Webhook entrypoint | `src/app/api/webhooks/stripe/route.ts` | Signature verification, idempotency, event routing. ONLY place that creates Booking + Payment rows from Stripe state. |
| Refund actions | `src/lib/actions/refund.ts` | `refundBookingAction`: Stripe refund + Payment.refundStatus=PENDING + AuditLog; webhook finalizes. `manualRefundBookingAction`: walk-in / no PaymentIntent; writes Payment + Booking + AuditLog in one transaction (no Stripe). Both gated by `requireRole('MANAGER', 'ADMIN')`. |

---

## 2. Hard rules

1. **Never `import` from `stripe`** outside `src/lib/stripe.ts`. Re-import `Stripe` types from `@/lib/stripe` (`import { type Stripe } from '@/lib/stripe'`). Drift sentinel fails the build otherwise.
2. **Never `import` from `resend`** outside `src/lib/email.ts`. Same enforcement.
3. **A Booking row is created in EXACTLY ONE place**: the webhook handler on `payment_intent.succeeded`. No other code path writes `status='CONFIRMED'` to a Booking. This guarantees: every confirmed booking has a captured Stripe payment.
4. **`confirmBooking` does NOT create the Booking row.** It only creates the Stripe PaymentIntent and returns its `client_secret`. The browser confirms the card via Stripe.js; the webhook then creates the Booking.
5. **The webhook is the SOLE source of truth for `Payment.refundStatus = SUCCEEDED|FAILED`** and `Booking.isRefunded = true` **for Stripe-captured payments.** The Stripe `refundBookingAction` only writes `refundStatus = PENDING`. **Exception:** walk-in manual refunds (`manualRefundBookingAction`, §3.3) set `SUCCEEDED` synchronously — no webhook.
6. **PaymentIntent metadata is the contract** between `confirmBooking` and the webhook. The webhook reconstructs the Booking from this metadata. Never trust client-supplied data on `success` — read the intent from Stripe.
7. **Webhook idempotency goes through the `StripeEvent` table.** Inserting the event id is the first DB write; a `P2002` conflict means "already processed" — return 200 without re-running side effects.
8. **Holds are availability locks, not booking drafts.** A `BookingHold` row has no package, no customer, no payment. It exists only to exclude its (time × lanes) from other customers' availability queries until either expiry or success.
9. **Hold expiration is lazy.** `getAvailableTimeSlots` runs `bookingHold.deleteMany({ expiresAt: { lt: now } })` before computing availability. No cron is needed for v1.
10. **Money is always integer cents.** Never use `Decimal`. Never use `toFixed` outside `src/lib/pricing.ts`.
11. **Refunds require `requireRole('MANAGER', 'ADMIN')`.** STAFF cannot refund. This is enforced server-side in `refundBookingAction` and `manualRefundBookingAction`. The drift sentinel does NOT special-case refunds — it's the server-action's responsibility.
12. **Webhook returns 200 quickly, even on handler error logging.** Stripe retries on non-2xx for hours. Long work goes in background jobs (none for v1).

---

## 3. Lifecycle

### 3.1 Booking creation (happy path)

```
Customer                Client (browser)          Server                    Stripe
   │                          │                      │                         │
   ├─ enters step 1 ──────────┤                      │                         │
   ├─ picks date+time ────────┤── acquireBookingHold─┤                         │
   │                          │                      ├─ BookingHold.create ────┤
   │                          │←─ holdId + expiresAt ┤                         │
   ├─ picks package ──────────┤                      │                         │
   ├─ enters details + Pay ───┤── confirmBooking ────┤                         │
   │                          │                      ├─ paymentIntents.create ─┤
   │                          │←─ clientSecret ──────┤                         │
   ├─ enters card details ────┤── stripe.confirmCard ┤────────────────────────►┤
   │                          │                      │                         │
   │                          │                      │←── webhook event ────── │
   │                          │                      ├─ StripeEvent.create     │
   │                          │                      ├─ Booking.create         │
   │                          │                      ├─ Payment.create         │
   │                          │                      ├─ BookingHold.deleteMany │
   │                          │                      ├─ sendBookingConfirmation│
   │                          │←─ success screen ────┤                         │
   ├─ receives email ─────────┤                      │                         │
```

### 3.2 Refund (happy path)

```
Manager/Admin           Server                    Stripe
     │                     │                         │
     ├─ refund click ──────┤                         │
     │                     ├─ requireRole(M,A) ──────┤
     │                     ├─ refunds.create ────────►
     │                     │←─ refund_id, pending────│
     │                     ├─ Payment.refundStatus=PENDING
     │                     ├─ AuditLog.create        │
     │←─ "pending" UI ─────┤                         │
     │                     │                         │
     │                     │←── charge.refunded ──── │
     │                     ├─ StripeEvent.create     │
     │                     ├─ Payment.refundStatus=SUCCEEDED
     │                     ├─ Booking.isRefunded=true│
     │                     ├─ Booking.status=CANCELLED│
```

### 3.3 Manual refund (walk-in / non-Stripe)

Walk-in bookings have a Payment row with `stripePaymentIntentId = NULL` (the customer paid cash / card-at-counter / comp). For these, MANAGER+ uses `manualRefundBookingAction`:

- No Stripe API call. The action writes directly to Payment + Booking + AuditLog in a single transaction.
- `Payment.refundStatus` lands in `SUCCEEDED` immediately (there is no async settlement).
- `Payment.status` is set to `'refunded_manual'`.
- Audit action: `BOOKING_MANUAL_REFUND` with `details: { method, amount, notes }`.
- The UI route is `/staff/bookings/[id]` — `RefundPanel` flips into manual mode automatically when the booking has no PaymentIntent.

The Stripe-backed `refundBookingAction` refuses to operate on walk-ins, and `manualRefundBookingAction` refuses to operate on Stripe payments. The two actions are mutually exclusive.

---

## 4. Schema reference

```
BookingHold
├─ id (cuid)
├─ tenantId
├─ startTime, endTime
├─ bowlerCount, laneCount
├─ expiresAt
└─ createdAt
   indexes: (tenantId, startTime, endTime), (expiresAt)

StripeEvent
├─ id (Stripe evt_… PK)
├─ type
├─ payload (raw JSON)
└─ processedAt
   indexes: (type)

Payment
├─ … (unchanged) …
├─ refundStatus: RefundStatus enum (NONE | PENDING | SUCCEEDED | FAILED)
└─ stripePaymentIntentId is UNIQUE — used as the webhook lookup key
```

---

## 5. Mock mode (dev-without-stripe)

| Condition | Behavior |
|---|---|
| `STRIPE_SECRET_KEY` unset, `NODE_ENV !== 'production'` | `isStripeMocked()` is true. `createPaymentIntent` + `createRefund` return deterministic mock objects (`pi_mock_…`, `re_mock_…`). `constructWebhookEvent` parses the body as plain JSON when a signature header is present. |
| `STRIPE_SECRET_KEY` unset, `NODE_ENV === 'production'` | Helpers return `null` from the client factory; webhook construction THROWS. Production refuses to run in mock mode. |
| `RESEND_API_KEY` unset, dev | `sendBookingConfirmation` logs the payload to console and returns `{ id: null }`. |
| `DATABASE_URL` unset, dev (`isDevWithoutDb`) | `confirmBooking` returns a mocked clientSecret; webhook handler returns `{ received: true, mocked: true }` and writes nothing. The booking flow renders end-to-end with no real reservations made. |

The dev modes compose: dev-without-db + dev-without-stripe still produces a clickable booking flow. Use this for design exploration; never confuse it with end-to-end testing.

---

## 6. Testing patterns

Per the convention in `STACK_BASELINE.md §9`, all payment-adjacent code uses Vitest with `vi.mock(...)` + `vi.hoisted(...)`. The reference tests are:

- `src/lib/stripe.test.ts` — wraps the Stripe SDK in a fake class; tests dev fallback and SDK delegation.
- `src/lib/actions/booking.test.ts` — mocks `@/lib/prisma`, `@/lib/stripe`, `@/lib/env`. Verifies hold lifecycle and PaymentIntent metadata shape.
- `src/lib/actions/refund.test.ts` — mocks `@/lib/auth` (`requireRole`), `@/lib/stripe`, `@/lib/prisma`. Verifies role gating, refund clamping, Stripe vs manual paths, and that `Booking.isRefunded` is NOT touched by the Stripe refund action.
- `src/app/api/webhooks/stripe/route.test.ts` — mocks Prisma, Stripe verification, email, and tenant lookup. Verifies idempotency (P2002 conflict), payment intent → Booking, charge.refunded reconciliation, and unknown event passthrough.

When adding new payment-adjacent code, copy one of these test files as a template. The drift sentinel does NOT check test coverage, but unit-test density is what keeps webhooks honest.

---

## 7. Environment variables

| Var | Required for | Dev fallback |
|---|---|---|
| `STRIPE_SECRET_KEY` | Real PaymentIntent + Refund creation | Mocked helpers; `isStripeMocked()` is true |
| `STRIPE_PUBLISHABLE_KEY` | Client-side Stripe.js (Phase 7 M8) | UI will not load Stripe Elements |
| `STRIPE_WEBHOOK_SECRET` | Production webhook signature verification | Dev parses unsigned bodies as JSON |
| `RESEND_API_KEY` | Real confirmation email delivery | Logged to server console only |
| `RESEND_FROM_EMAIL` | Custom from address | Falls back to `Royal Z Lanes <bookings@royalz.local>` |
| `NEXT_PUBLIC_APP_URL` | Webhook URL for Stripe dashboard | n/a |

---

## 8. When you change this surface

1. **Schema change** (BookingHold, StripeEvent, Payment fields): regenerate Prisma client + update this contract + update `STACK_BASELINE §3` reference table.
2. **New webhook event** (e.g. `charge.dispute.created`): add the handler in `route.ts`, add a test, update §3.2 ASCII diagram, document the side effect in this file.
3. **New refund scenario** (partial, multiple): the webhook handler's `charge.refunded` branch already supports partial via `amount_refunded`. Make sure the action passes the right `amount` and that the UI surfaces "Partially refunded".
4. **New role or stricter gating**: update `refundBookingAction` AND `AUTH.md §3` (role hierarchy). Add a test that asserts STAFF is rejected.
5. **Replacing Stripe with another processor**: rewrite `src/lib/stripe.ts` and the webhook handler. Everything else (actions, UI) should be unaffected — that's why the drift rule exists.

---

## 9. Customer payment UX (Phase 12 M12-M2)

### 3D Secure / `requires_action` (M12-M2a)

- `PaymentForm` calls `stripe.confirmPayment({ redirect: 'if_required' })`.
- When confirm returns `requires_action` or `authentication_required`, it immediately calls `stripe.handleNextAction({ clientSecret })` so the bank modal opens without a dead-end error.
- User-safe copy lives in `src/lib/payment-errors.ts` (`paymentErrorMessage`, `requiresActionMessage`).
- After a **redirect** flow, `/book/success` reads `redirect_status=failed` and shows “Back to payment” (no booking poll).

### Staff payment resume link

- **`createPaymentResumeLink(paymentIntentId)`** in `src/lib/actions/payment-resume.ts` — STAFF+; validates the PI is still resumable via `retrievePaymentIntent` in `src/lib/stripe.ts`.
- Returns a signed URL to **`/book/resume-payment?t=…`** (HMAC token in `src/lib/payment-resume-token.ts`, 24h TTL, signed with `AUTH_SECRET`).
- **`getResumePaymentClientSecret(token)`** — public; returns `client_secret` for `PaymentForm`.
- Staff UI: `PaymentResumePanel` on `/staff` cockpit.

## 10. Open items / known v1 limits

- **No webhook retry tooling.** Stripe retries automatically. If we need to replay manually (rare), we can `DELETE FROM stripe_event WHERE id = '…'` and have Stripe redeliver — that's it.
- **Email sending is in-line with the webhook.** If Resend is slow we delay returning 200 to Stripe. Acceptable for v1; move to a background queue if it ever causes retries.
- **Stripe partial refunds:** multiple partial refunds are allowed while `refundStatus !== PENDING` and remaining balance &gt; 0. `charge.refunded` sets `Booking.isRefunded` only when `amount_refunded >= payment.amount`.
