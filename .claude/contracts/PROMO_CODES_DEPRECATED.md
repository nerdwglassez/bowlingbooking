# PROMO_CODES_DEPRECATED.md
#
# Status: DEPRECATED — documents the current PromoCode entity.
# Wireframe decision: PromoCode replaced by CODE_REQUIRED packages.
# See Migration 4 in .claude/SCHEMA_MIGRATIONS.md.
#
# Until Migration 4 completes: use this contract for PromoCode work.
# After Migration 4 completes: update this header to ARCHIVED.
#
---

# Promo codes contract (Phase 11 M5)

## Schema

- **`PromoCode`** — per-tenant codes stored **lowercased**; unique on `(tenantId, code)`.
- **`PromoDiscountType`** — `PERCENT` (whole percent 1–100 of subtotal) or `FIXED` (cents off, capped at subtotal).
- **`Booking`** — optional `promoCodeId`, integer `discountAmount` (cents). `totalAmount` remains the **charged** amount (Stripe PaymentIntent amount after discount).

## Server actions

| Action | Module | Notes |
|--------|--------|--------|
| `validatePromoCode(tenantId, rawCode, subtotalCents)` | `src/lib/actions/promo.ts` | Public; **no auth**. Validation only — **does not** increment `usesCount`. |
| `confirmBooking` | `src/lib/actions/booking.ts` | Accepts optional `promoCode` string; **re-validates** with `validatePromoCode`; charges `subtotal − discountCents`. Writes `subtotalCents`, `promoCode`, `discountCents` into PaymentIntent metadata. |
| `listPromosForAdmin`, `getPromoForAdmin`, `createPromoAction`, `updatePromoAction`, `deactivatePromoAction` | `src/lib/actions/admin.ts` | **MANAGER+**; audit-logged (`PROMO_CREATED`, `PROMO_UPDATED`, `PROMO_DEACTIVATED`). |

## Customer flow

1. **Checkout (confirm step)** — `BookingContext.applyPromoCode` calls `validatePromoCode` for UI preview; `PriceFooter` shows subtotal / promo / total.
2. **PaymentIntent** — `confirmBooking` re-runs `validatePromoCode` with the same subtotal; client cannot forge `discountCents`.
3. **Webhook** — On `payment_intent.succeeded`, reads `metadata.promoCode` / `discountCents`. If the DB row is still incrementable (active, not expired, under `maxUses`), sets `Booking.promoCodeId`, increments `usesCount`, and writes **`BOOKING_PROMO_APPLIED`**. If the row is no longer valid, logs a **warning** but still stores `discountAmount` from metadata (customer-friendly: they already paid the reduced amount).

## Audit log

- `PROMO_CREATED`, `PROMO_UPDATED`, `PROMO_DEACTIVATED` — admin mutations; entity `PromoCode`.
- `BOOKING_PROMO_APPLIED` — successful link on paid booking; entity `Booking`.

## Hard rules

1. **Transactional state** — Promo row updates (`usesCount`) and booking promo fields run inside the same `prisma.$transaction` as booking creation in the webhook.
2. **`usesCount` only increments in the webhook** — never in `validatePromoCode` or `confirmBooking`.
3. **Soft delete only** — `deactivatePromoAction` sets `active: false`; never `prisma.promoCode.delete`.
4. **Case-insensitive codes** — always normalized to lowercase for storage and lookup.
5. **`discountCents` is always computed server-side** from subtotal + row rules; never trust client-supplied discount amounts.

## Test approach

- **`src/lib/actions/promo.test.ts`** — DB and dev-without-db branches, all throw paths, caps, trimming.
- **`src/lib/actions/booking.test.ts`** — mocked `validatePromoCode`; asserts PaymentIntent amount + metadata.
- **`src/lib/actions/admin.test.ts`** — role gating, CRUD + audit, validation, dev mocks; no `delete` API.
- **`src/app/api/webhooks/stripe/route.test.ts`** — promo metadata path with mocked `promoCode` transaction client.

## Deploy

Apply a Prisma migration that adds `promo_codes`, `Booking.promo_code_id`, and `Booking.discount_amount` before production traffic. Local command (creates migration SQL):

`npx prisma migrate dev --name add-promo-codes`

## Abuse / rate limiting

Promo validation is a public server action (unsigned customers). **`validatePromoCode`** calls `assertPublicRateLimit('promo_validate')`; edge WAF limits are still required — see `.claude/contracts/OPS.md` and `docs/RUNBOOK.md` § Edge security.
