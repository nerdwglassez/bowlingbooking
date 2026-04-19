# Booking components

- **Class:** Canonical
- **Owner:** Product + Frontend
- **Last reviewed:** 2026-04-12
- **Update trigger:** Changes to booking step behavior, booking auth prompts, checkout/payment UI state, or booking summary interactions

## Purpose

Define reusable booking UI component contracts used in customer reservation journeys.

## Scope

- In scope: `components/booking/*` components and route usage in customer-facing surfaces.
- Out of scope: internal staff booking editing screens and shared low-level UI primitives.
- Linked docs: [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md), [../services/PAYMENTS_AND_WEBHOOKS.md](../services/PAYMENTS_AND_WEBHOOKS.md), [UI_PRIMITIVES.md](UI_PRIMITIVES.md).

## Component map

| Component | Primary role | Common route surfaces |
|----------|---------------|-----------------------|
| `DateAndTimeStepOne` | Step 1 date/time selection and slot fetch | `/book` |
| `AvailabilityCalendar` | Calendar interaction wrapper | `/book` |
| `PackageSelectionCard`, `PackageDetailPanel` | Package browsing and selection details | `/book` |
| `BookingSummary` | Running totals and booking context | `/book`, `/bookings/[id]` related views |
| `GuestCheckout`, `LoginPrompt`, `SignUpFormInline`, `AuthModal` | Guest/account conversion and auth prompts | `/book`, header auth modal surfaces |
| `StripePaymentForm` | Payment input and confirmation integration point | `/book` step 4 |
| Progressive step UX in `DateAndTimeStepOne` | Group-size and step interaction behavior | `/book` |

## Behavioral contracts

- Booking components must not bypass server-enforced availability, pricing, or auth checks.
- Client-side totals and previews are informational; authoritative values come from API responses.
- `DateAndTimeStepOne`:
  - Supports constrained booking window behavior and stale-slot handling.
  - Displays loading, error, and no-availability states.
- `StripePaymentForm`:
  - Uses Stripe Elements flow and never handles raw card data directly in app logic.
- Auth-related booking components must preserve guest-path and signed-in-path parity.

## Component-to-route dependency mapping

| Route | Key booking components |
|------|-------------------------|
| `/book` | `DateAndTimeStepOne`, `AvailabilityCalendar`, `PackageSelectionCard`, `PackageDetailPanel`, `BookingSummary`, `GuestCheckout`, `StripePaymentForm`, auth prompt components |
| `/book/confirmation` | Summary/confirmation display patterns (route component-driven with shared booking presentation styles) |
| `/bookings`, `/bookings/[id]` | Booking summary and action presentation contracts that must stay aligned with booking flow semantics |

## Accessibility and UX requirements

- Time/date and package selections must preserve keyboard-accessible controls and visible focus states.
- Loading and failure states should provide explicit messaging and retry affordances.
- Summary components must keep price clarity and avoid hidden charge ambiguity.

## Security and privacy notes

- Never include real payment keys, customer identifiers, or account tokens in documentation examples.
- Ensure auth prompts and guest flows do not imply client-only access control.

## Testing and validation

- Validate step progression and state transitions for guest and signed-in paths.
- Validate payment step failure/retry behavior.
- Validate that no component state permits invalid bypass of terms/payment requirements.

## Change log

- 2026-04-12: Added component contract and route dependency map for booking component set.

## When you change behavior

Update this doc alongside booking component contract changes and cross-check:

- [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md)
- [../services/PRICING_DISCOUNTS_LOYALTY.md](../services/PRICING_DISCOUNTS_LOYALTY.md) when totals/pricing interactions change
- [../services/PAYMENTS_AND_WEBHOOKS.md](../services/PAYMENTS_AND_WEBHOOKS.md) when payment interaction behavior changes
