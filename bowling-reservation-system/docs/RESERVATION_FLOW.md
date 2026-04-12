# Customer reservation flow

## Purpose

Define current customer-facing reservation behavior, system boundaries, and implementation contracts for public and signed-in booking journeys.

## Scope

- **In scope:** booking entry, step flow, confirmation, account/profile, booking management, customer waitlist claim, customer-facing gift card and loyalty touches.
- **Out of scope:** staff/admin operations, role management rules for internal tools, deployment runbooks.
- **Linked docs:** [STAFF_AND_ADMIN_EXPERIENCE.md](STAFF_AND_ADMIN_EXPERIENCE.md), [SHARED_PLATFORM.md](SHARED_PLATFORM.md), [PRD_GAP_ANALYSIS.md](../PRD_GAP_ANALYSIS.md).

## Routes / APIs / components

### Customer routes

| Area | Route | Notes |
|------|-------|-------|
| Entry | `/` | Redirects to `/book` ([`app/page.tsx`](../app/page.tsx)) |
| Booking | `/book` | Multi-step booking page ([`app/book/page.tsx`](../app/book/page.tsx)) |
| Confirmation | `/book/confirmation` | Post-payment confirmation ([`app/book/confirmation/page.tsx`](../app/book/confirmation/page.tsx)) |
| My bookings | `/bookings`, `/bookings/[id]`, `/bookings/[id]/reschedule` | List, detail, cancel/modify links, receipt/PDF/print |
| Customer home | `/dashboard` | Upcoming bookings and CTA to book |
| Profile | `/profile` | Customer account + communication preferences |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password` | Standalone customer auth pages |
| Gift cards | `/gift-cards` | Customer purchase flow |
| Waitlist | `/waitlist/claim` | Token-based claim flow |

### APIs used most by this flow

| Area | Routes (under `app/api/`) |
|------|---------------------------|
| Availability and booking | `availability`, `bookings`, `bookings/[id]/*` |
| Catalog and price | `packages`, `products`, `pricing` |
| Discount preview | `discount-codes/preview` |
| Authentication | `auth/*` |
| Payments | `config/stripe`, `bookings/[id]/payment-intent`, `bookings/[id]/confirm-payment` |
| Gift cards | `gift-cards/validate`, `gift-cards/purchase`, `gift-cards/confirm` |
| Loyalty | `loyalty` |
| Waitlist | `waitlist`, `waitlist/claim` |

### Key components

| Area | Components | Notes |
|------|------------|-------|
| Booking UI | `components/booking/*` | Step UI, summaries, auth prompting, payment forms |
| Shared header/chrome | `components/layout/AppExperienceHeader` | Uses `variant="booking"` for customer surfaces |
| Customer subpage header | `components/layout/SubpageHeaderUser` | Used where subpages need compact user state |

## Behavioral contract

- `GET /` always redirects to `/book`.
- `/book` remains the canonical customer entry and supports guest + account checkout.
- Booking step order remains: date/time -> booking details -> packages/extras -> review/payment.
- Step 4 requires terms acceptance before booking completion.
- Post-booking confirmation provides reference details and receipt/print/PDF actions.
- `/profile` is customer-only. Staff/manager/admin traffic is redirected to internal account settings.
- Waitlist claim uses token-based verification from email/SMS notification flows.

## Edge cases and failure modes

- **Slot changed during checkout**
  - Trigger: availability changed after customer selected slot.
  - System behavior: booking API rejects stale slot.
  - User-visible outcome: user must pick a new slot.
- **Payment intent/confirm fails**
  - Trigger: Stripe error, invalid client secret, network interruption.
  - System behavior: booking remains incomplete until confirm succeeds.
  - User-visible outcome: actionable payment error and retry path.
- **Invalid/expired discount or gift card**
  - Trigger: code expired, maxed redemptions, inactive code, insufficient gift card balance.
  - System behavior: preview/validation route rejects application.
  - User-visible outcome: clear message, total recalculated without invalid code.
- **Unauthorized booking detail access**
  - Trigger: customer attempts to access another user's booking.
  - System behavior: API and server route checks ownership.
  - User-visible outcome: denied access (not found or unauthorized path).
- **Waitlist claim token invalid**
  - Trigger: expired or already used claim token.
  - System behavior: claim API rejects token.
  - User-visible outcome: slot cannot be claimed and user must rejoin waitlist.

## Security and privacy notes

- Session and role handling are shared contracts in [SHARED_PLATFORM.md](SHARED_PLATFORM.md).
- Customer-facing APIs must keep ownership checks on booking reads/updates.
- Do not store or expose card data outside Stripe-managed flows.
- Use placeholders only in docs and examples; never commit real credentials or personal data.

## Observability and operations

- Monitor booking create, payment intent, payment confirm, and waitlist claim error rates.
- Monitor failed confirmation emails and reminder sends for customer-facing communication reliability.
- Use [docs/SECURITY.md](SECURITY.md) and [docs/PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md](PERFORMANCE_AND_SECURITY_REVIEW_PLAN.md) for operational checks.

## Testing and validation

- Validate happy path: guest booking and signed-in booking complete end-to-end.
- Validate failure paths: stale availability, payment failure, invalid discount/gift card, waitlist token rejection.
- Validate authorization: customer cannot mutate bookings they do not own.

## Design and UX notes

- Step 1 visuals/specs: [STEP1_VISUAL_DESCRIPTIONS.md](STEP1_VISUAL_DESCRIPTIONS.md), [STEP1_INTERACTION_SPEC.md](STEP1_INTERACTION_SPEC.md), [FIGMA_STEP1_EVENT_TYPE_SELECTED.md](FIGMA_STEP1_EVENT_TYPE_SELECTED.md).
- PWA/installable experience is configured around booking entry routes.

## Change log

- 2026-04-12: Reorganized into canonical template structure with explicit contracts and failure modes.

## When you change behavior

Update this file in the same PR as customer flow changes, and also update:

- [`PRD_GAP_ANALYSIS.md`](../PRD_GAP_ANALYSIS.md)
- [SHARED_PLATFORM.md](SHARED_PLATFORM.md) for shared contract changes
- [docs/governance/UPDATE_CHECKLIST.md](governance/UPDATE_CHECKLIST.md) verification items before commit/push
