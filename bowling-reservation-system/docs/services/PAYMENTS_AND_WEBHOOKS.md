# Payments and webhooks service contract

## Purpose

Define the payment pipeline boundaries for customer checkout and booking confirmation, including Stripe integration points and webhook expectations.

## Scope

- In scope: payment intent setup, confirmation behavior, checkout dependencies, and webhook hardening expectations.
- Out of scope: in-depth finance reconciliation and accounting exports.
- Linked docs: [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md), [../SHARED_PLATFORM.md](../SHARED_PLATFORM.md), [../SECURITY.md](../SECURITY.md).

## Contract surface

| Area | Location | Notes |
|------|----------|-------|
| Stripe config | `lib/stripe-config.ts` | Server-side Stripe client/config wrapper |
| Public key exposure | `app/api/config/stripe` | Returns publishable key only |
| Booking payment routes | `app/api/bookings/[id]/*` | Intent creation and payment confirmation behavior |
| Checkout UI integration | `components/booking/StripePaymentForm*` | Client payment element handling in step 4 |

## Behavioral contract

- Payment initialization must happen server-side; only publishable key reaches client.
- Booking completion must require successful payment confirmation when payment is required.
- Payment and booking status transitions should remain idempotent across retries.
- Webhook-dependent behaviors must verify signatures before mutating booking state.

## Failure modes and recovery

- Intent create failure:
  - Trigger: Stripe API/network issue.
  - Behavior: API returns retryable error.
  - Outcome: user can retry payment setup without duplicate booking side effects.
- Confirm payment failure:
  - Trigger: card decline, authentication failure, expired client secret.
  - Behavior: confirmation route rejects transition to paid state.
  - Outcome: booking remains incomplete/unpaid until confirmed.
- Missing webhook verification:
  - Trigger: webhook endpoint accepts unsigned or invalid payload.
  - Behavior: must reject event and log security warning.
  - Outcome: prevents forged payment state updates.

## Security and compliance notes

- Never store raw card data in app logs, DB fields, or docs.
- Keep Stripe secret and webhook secret in server-side env only.
- Use placeholders in docs (`sk_live_...`, `whsec_...`) and never real values.
- Validate replay/idempotency strategy for confirmation and webhook processing paths.

## Observability

- Track intent creation failures, confirm-payment failures, and webhook signature failures.
- Alert on unusual spikes in payment failures by endpoint and response code.

## Validation checklist

- Manual: successful card payment flow through booking confirmation.
- Manual: decline/failure flow with clear retry behavior.
- Security: webhook signature validation test (invalid signature must fail).
- Regression: no customer-facing booking is marked paid without payment confirmation.

## Change log

- 2026-04-12: Initial service contract extraction from shared/flow docs.
