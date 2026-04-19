# Pricing, discounts, loyalty, and gift cards

## Purpose

Define the pricing contract used by customer checkout and internal workflows, including discount codes, loyalty redemption, and gift card application boundaries.

## Scope

- In scope: pricing helpers, discount preview/apply behavior, loyalty usage, gift card validation/confirmation behavior.
- Out of scope: visual design of booking steps and staff/admin route UX.
- Linked docs: [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md), [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md), [../SHARED_PLATFORM.md](../SHARED_PLATFORM.md).

## Service boundaries and implementation

| Area | Location | Notes |
|------|----------|-------|
| Core pricing helpers | [`lib/pricing.ts`](../../lib/pricing.ts) | Source of booking total and breakdown logic |
| Discount code logic | [`lib/discount-codes.ts`](../../lib/discount-codes.ts) | Validation and apply behavior |
| Customer discount preview API | `POST app/api/discount-codes/preview` | Pre-checkout validation for discount code entry |
| Booking create/apply | `app/api/bookings` | Applies discount/gift card/loyalty effects during booking |
| Gift card APIs | `app/api/gift-cards/validate`, `purchase`, `confirm` | Validation and purchase/confirm lifecycle |
| Loyalty API | `app/api/loyalty` | Balance and redemption behavior for customer flow |

## Input and output contracts

- **Pricing input:** date/time, lanes, package, extras/add-ons, guest details, optional adjustments (discount code, gift card amount, loyalty redemption).
- **Pricing output:** normalized subtotal, discount and credit line items, taxes/fees (if configured), and final payable amount.
- **Discount preview output:** valid/invalid status, discount type/value, constraints (expiry, max redemption, active flag).
- **Gift card validation output:** card validity, remaining balance, redeemable amount limits.
- **Loyalty output:** available points and equivalent redeemable amount under configured conversion rules.

## Dependencies

- Depends on booking and product/package data models in Prisma schema.
- Depends on staff/admin-managed settings for discount code availability and package pricing.
- Interacts with Stripe payment confirmation in final booking settlement.

## Failure modes and fallback behavior

- Invalid discount code:
  - Trigger: expired/inactive/maxed or malformed code.
  - Behavior: preview/apply path rejects discount and keeps price without code.
- Gift card over-application:
  - Trigger: requested amount exceeds balance or payable total.
  - Behavior: service caps or rejects value according to endpoint contract.
- Loyalty redemption conflict:
  - Trigger: stale points state or invalid redemption amount.
  - Behavior: booking API recalculates and rejects invalid redemption.
- Calculation mismatch:
  - Trigger: catalog/settings changed mid-checkout.
  - Behavior: server recalculates authoritative total at booking creation.

## Security and privacy notes

- Treat all discount/gift/loyalty values as untrusted input until server validation.
- Do not expose internal pricing logic shortcuts in client-only flows.
- Keep gift card and loyalty identifiers out of verbose logs.

## Observability

- Track failed discount previews, failed gift card validations, and pricing mismatch errors.
- Watch for spikes in redemption failures after pricing/config changes.

## Validation checks

- Test checkout totals with no discount, with valid discount, invalid discount, gift card, and loyalty redemption.
- Confirm server totals remain authoritative over any client-calculated estimate.
- Validate that internal admin/staff updates to discounts are reflected in customer preview behavior.

## Change log

- 2026-04-12: Initial service contract documentation.

## When you change behavior

Update this file with any pricing/discount/credit contract change and cross-update:

- [../RESERVATION_FLOW.md](../RESERVATION_FLOW.md)
- [../STAFF_AND_ADMIN_EXPERIENCE.md](../STAFF_AND_ADMIN_EXPERIENCE.md) when internal tools are impacted
- [../PRD_GAP_ANALYSIS.md](../../PRD_GAP_ANALYSIS.md)
