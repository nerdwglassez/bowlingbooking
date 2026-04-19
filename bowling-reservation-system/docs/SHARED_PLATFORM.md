# Shared platform (auth, data, pricing, availability)

Use this doc **once** for concepts that apply to both [customer reservation flows](RESERVATION_FLOW.md) and [staff/admin](STAFF_AND_ADMIN_EXPERIENCE.md). The flow docs link here instead of duplicating details.

## Product and implementation truth

- **Product requirements:** workspace root [`bowling-prd.md`](../../bowling-prd.md) (full PRD).
- **What is built vs gaps:** [`PRD_GAP_ANALYSIS.md`](../PRD_GAP_ANALYSIS.md) in this app folder—update when behavior changes.

## Authentication and roles

- **Session:** HTTP-only cookie `session_token` (name + flags in [`lib/session-cookie.ts`](../lib/session-cookie.ts)); validated in [`lib/auth.ts`](../lib/auth.ts) via Prisma `Session` + `User`.
- **`getSession()` / `requireAuth()`:** Server-side helpers; staff layouts and API routes call `requireAuth('STAFF')` or `requireAuth('ADMIN')` as needed.
- **Roles (Prisma `UserRole`):** `CUSTOMER`, `STAFF`, `MANAGER`, `ADMIN`. Staff UIs allow `STAFF`, `MANAGER`, and `ADMIN`; admin-only UIs require `ADMIN`. Managers participate in price-override approval workflows.
- **Auth API:** under `app/api/auth/*` (login, logout, register, guest-register, forgot/reset password, me, 2FA setup/verify/disable/confirm).
- **Customer pages:** `app/login`, `register`, `forgot-password`, `reset-password`.

## Database

- **ORM:** Prisma; client in [`lib/db.ts`](../lib/db.ts).
- **Schema:** `prisma/schema.prisma`.

## Availability and scheduling

- **Core logic:** [`lib/availability.ts`](../lib/availability.ts)—operating hours, special hours, lane blocks, and slot generation for booking.
- **Public API:** `GET/POST` patterns under `app/api/availability/route.ts` (and related booking flows) consume this.

## Pricing and packages

- **Pricing helpers:** [`lib/pricing.ts`](../lib/pricing.ts)—booking totals, settings-driven breakdowns; used heavily by `app/book/page.tsx` and staff override flows.
- **Public reads:** `app/api/pricing`, `app/api/packages`, `app/api/products` (see route files for methods).

## Discount codes (promo / corporate)

- **Data:** Prisma model `DiscountCode` in [`prisma/schema.prisma`](../prisma/schema.prisma)—online vs invoice payment mode, optional percent or fixed discount, max redemptions, expiry; `Booking` stores `discountCodeId` and an `appliedDiscountCode` snapshot.
- **Customer flow:** Preview with `POST /api/discount-codes/preview`; booking creation applies the code via `app/api/bookings` ([`lib/discount-codes.ts`](../lib/discount-codes.ts)).
- **Internal management:** Staff settings [`/staff/settings/discount-codes`](../app/staff/settings/discount-codes/page.tsx) and admin [`/admin/discount-codes`](../app/admin/discount-codes/page.tsx); details and API paths in [STAFF_AND_ADMIN_EXPERIENCE.md](STAFF_AND_ADMIN_EXPERIENCE.md).

## Payments and email

- **Stripe:** [`lib/stripe-config.ts`](../lib/stripe-config.ts); client config `app/api/config/stripe`; server payment flows under `app/api/bookings/*` (e.g. payment intent, confirm payment). Configure webhook signing in Vercel when you add a Stripe webhook route.
- **Email:** [`lib/email.ts`](../lib/email.ts) (e.g. Resend); transactional sends tied to booking confirmation and reminders.

## Environment and deployment

- **Local vs production:** [LOCAL_VS_LIVE.md](LOCAL_VS_LIVE.md).
- **Variable list:** [`.env.example`](../.env.example) and [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md).
- **Cron:** reminder and marketing routes under `app/api/cron/*`; `CRON_SECRET` and schedule in `vercel.json` / deploy doc.

## Integrations (optional)

- Mailchimp, SMS (Twilio), etc. are configured via settings and `lib/*` modules as documented in PRD gap analysis—treat env vars as optional unless you enable those features.

## Service contracts (detailed)

Use these contract docs when changing shared platform behavior:

- [services/AUTH_AND_ROLES.md](services/AUTH_AND_ROLES.md)
- [services/AVAILABILITY_AND_SCHEDULING.md](services/AVAILABILITY_AND_SCHEDULING.md)
- [services/PRICING_DISCOUNTS_LOYALTY.md](services/PRICING_DISCOUNTS_LOYALTY.md)
- [services/PAYMENTS_AND_WEBHOOKS.md](services/PAYMENTS_AND_WEBHOOKS.md)
- [services/NOTIFICATIONS_AND_CRON.md](services/NOTIFICATIONS_AND_CRON.md)
- [services/PARTNER_API_AND_POS.md](services/PARTNER_API_AND_POS.md)

## UI primitives

- **`components/layout/AppExperienceHeader`** — Shared header: `variant="booking"` (venue, Login / signed-in user block) vs `variant="staff"` (gradient bar for `/staff` and `/admin`). Server passes `initialUser` from [`lib/header-user.ts`](../lib/header-user.ts) `getHeaderUser()`.
- Prefer **`components/ui/Button`** (variants: `primary`, `secondary`, `danger`, `ghost`, `outline`; sizes: `sm`, `md`, `lg`, `icon`; `rounded`, `isLoading`) plus `className` for layout—see [docs/README.md](README.md). Gradually replace ad-hoc `<button>` where it improves consistency.

## Architecture conventions

- Refactor layering and import-direction rules live in [ARCHITECTURE_CONVENTIONS.md](ARCHITECTURE_CONVENTIONS.md). Use it as the default guardrail before moving code between `app`, `components`, `hooks`, and `lib`.
