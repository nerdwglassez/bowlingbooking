# Customer reservation flow

Scope: **public and signed-in customer** journeys—booking, confirmation, account, post-booking actions. For staff and admin surfaces, see [STAFF_AND_ADMIN_EXPERIENCE.md](STAFF_AND_ADMIN_EXPERIENCE.md). Shared concepts: [SHARED_PLATFORM.md](SHARED_PLATFORM.md).

## Entry and routing

- **`/`** — Redirects to `/book` ([`app/page.tsx`](../app/page.tsx)).
- **`/book`** — Main multi-step booking UI ([`app/book/page.tsx`](../app/book/page.tsx)): date/time → details (bowlers, shoes) → packages/extras → review/payment (Stripe, guest or account, terms, optional promo/corporate discount code, loyalty redemption when applicable).
- **`/book/confirmation`** — Post-payment confirmation ([`app/book/confirmation/page.tsx`](../app/book/confirmation/page.tsx)).
- **`/bookings`** — Customer booking list ([`app/bookings/page.tsx`](../app/bookings/page.tsx)).
- **`/bookings/[id]`** — Detail, cancel (when allowed), modify/reschedule links, receipt/print/PDF ([`app/bookings/[id]/page.tsx`](../app/bookings/[id]/page.tsx)).
- **`/bookings/[id]/reschedule`** — Reschedule flow ([`app/bookings/[id]/reschedule/page.tsx`](../app/bookings/[id]/reschedule/page.tsx)).
- **`/dashboard`** — Customer home after auth; upcoming bookings, CTA to book ([`app/dashboard/page.tsx`](../app/dashboard/page.tsx)).
- **`/profile`** — Profile and communication preferences ([`app/profile/`](../app/profile/)).

## Auth pages (customer)

- **`/login`**, **`/register`**, **`/forgot-password`**, **`/reset-password`** — Standalone auth pages under `app/`.

## Gift cards and loyalty (customer-facing)

- **`/gift-cards`** — Purchase flow ([`app/gift-cards/`](../app/gift-cards/)).
- Booking step 4 uses gift card validation and loyalty APIs (see API list below).

## Waitlist (customer-facing)

- **`/waitlist/claim`** — Token-based claim when a spot opens ([`app/waitlist/claim/page.tsx`](../app/waitlist/claim/page.tsx)).
- Join/waitlist behavior is driven by `app/api/waitlist/*` and booking/availability UX on `/book`.

## Key UI components

- **`components/booking/`** — `DateAndTimeStepOne`, `BookingSummary`, `StripePaymentForm`, `GuestCheckout`, `AuthModal`, `LoginPrompt`, `SignUpFormInline`, `PackageDetailPanel`, `AvailabilityCalendar`, `BookingSummaryBar`, etc.
- **`components/layout/`** — **`AppExperienceHeader`** (`variant="booking"` on `/book`, `/bookings`, profile, gift cards, dashboard; `variant="staff"` on `/staff` and `/admin`): venue strip, **Login** + `AuthModal` when signed out, or **name / email / initials + My Bookings or Staff/Admin + Profile + Log out** when signed in. Staff/admin gradient bar includes `StaffHeaderTitle`. Also `SubpageHeaderUser` where used.

## APIs most relevant to this flow

| Area | Routes (under `app/api/`) |
|------|---------------------------|
| Slots / booking data | `availability`, `bookings`, `bookings/[id]/*` (payment intent, confirm-payment, receipt, reschedule) |
| Catalog / price | `packages`, `products`, `pricing` |
| Discount codes | `discount-codes/preview` (validate before checkout); codes are configured in staff/admin (see [STAFF_AND_ADMIN_EXPERIENCE.md](STAFF_AND_ADMIN_EXPERIENCE.md)) |
| Auth | `auth/*` |
| Stripe publishable | `config/stripe` |
| Gift cards | `gift-cards/validate`, `purchase`, `confirm` |
| Loyalty | `loyalty` |
| Waitlist | `waitlist`, `waitlist/claim` |

## Design and UX notes

- Step 1 visuals/specs: [STEP1_VISUAL_DESCRIPTIONS.md](STEP1_VISUAL_DESCRIPTIONS.md), [STEP1_INTERACTION_SPEC.md](STEP1_INTERACTION_SPEC.md), [FIGMA_STEP1_EVENT_TYPE_SELECTED.md](FIGMA_STEP1_EVENT_TYPE_SELECTED.md).
- PWA/installable experience is configured for the booking entry URL (see PRD gap analysis / manifest).

## When you change behavior

Update [`PRD_GAP_ANALYSIS.md`](../PRD_GAP_ANALYSIS.md) and adjust this file so AI and humans stay aligned with routes and APIs.
