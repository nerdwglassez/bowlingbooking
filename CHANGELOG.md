# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Audit remediation: `BookingBowler` shoe persistence, online `BookingLane` assignment, policy snapshots on bookings, consent fields, package `inclusions`/`CODE_REQUIRED` columns, `PricingPeriod`, `ClaimToken`, customer `/dashboard`, staff check-in/no-show/complete actions.
- Project changelog (`CHANGELOG.md`), `/changelog` Cursor skill, and Cursor rule for Keep a Changelog updates.

### Changed

- Policy settings promoted from `Tenant.config` JSON to typed columns; cancel/refund reads booking snapshots.
- Customer cancel aligns refund `isRefunded` timing with Stripe webhook (staff path).
- `confirmBooking` validates optional add-ons server-side; PaymentIntent metadata carries shoes, add-ons, and consent.

### Fixed

- Confirmation email used venue name instead of package name.
- Online checkout failed when optional package add-ons were selected.
- `maxOnlineBowlers` tenant setting ignored on booking Step 1 UI.

### Changed

- Hide cockpit payment resume panel pending UX redesign; `createPaymentResumeLink` and `/book/resume-payment` remain available for existing links.

### Fixed

- `Button` with `asChild` passes a single child to Radix `Slot`, fixing a runtime crash on the admin “← Staff cockpit” link and other link-styled buttons.

## [0.2.0] - 2026-05-26

### Added

- Customer self-service: find booking by email + confirmation code, cancel with policy-based refunds, and calendar (`.ics`) download.
- Staff app: cockpit, schedule with lane blocking, walk-in bookings, booking detail, and payment-resume links for abandoned checkouts.
- Admin app: venue details, operating hours, packages, promo codes, team management, reports, and audit log (audit and reports are `ADMIN`-only).
- Stripe online booking flow with holds, lane-capacity checks, 3DS via `handleNextAction`, and webhook-finalized bookings.
- Edge rate limiting (find-booking, ICS, promo validate) with in-app backstop; Sentry instrumentation and production trace sampling.
- `/api/health` deployment smoke check for database, tenant row, and auth configuration.
- Committable `.env.example` template (placeholders only); see `docs/RUNBOOK.md` for production env requirements.
- Crypto-backed booking confirmation codes (`src/lib/booking-codes.ts`) with collision retry on Stripe finalize and walk-in create.
- Role-aware sign-in redirects (`auth-paths`, `post-sign-in`); customer booking header “Sign in” sends staff to `/signin?from=/staff`.
- Configurable home redirect (`NEXT_PUBLIC_HOME_ENTRY`, `src/lib/env.home-entry.ts`).

### Changed

- Root `/` redirects at the edge via `proxy.ts`; customer vs staff entry is configurable.
- Stripe webhook and walk-in booking retry when `confirmation_code` unique constraint collides (`P2002`), in addition to serializable transaction retries.
- Admin sidebar hides **Reports** and **Audit log** for `MANAGER` users (server actions remain `ADMIN`-only).
- Auth.js handlers mounted at `/api/auth`; staff and admin layouts marked `force-dynamic` for reliable session reads.
- `prisma generate` runs on `postinstall` and before production builds.

### Fixed

- Sign-in redirect no longer swallowed by `global-error` on Next.js redirect digests.
- Sign-in surfaces misconfigured `AUTH_SECRET` / `AUTH_URL` on Vercel instead of failing opaquely.
- Booking finalize hardened for lane capacity, Stripe event idempotency, and concurrent hold conflicts.
- Prisma `DATABASE_URL` loading in Next.js dev; health endpoint guidance when `DATABASE_URL` is missing on Vercel.

### Security

- Confirmation codes use `crypto.randomInt` instead of `Math.random` for customer lookup identifiers.
- Stripe webhooks require signature verification in production; unsigned JSON parsing is dev/test only.
- Public booking lookup and ICS endpoints rate-limited; customer cancel requires matching email + code.

## [0.1.0] - 2026-05-12

### Added

- Initial release (Phases 0–7): Next.js App Router app, design token system, UI primitives and patterns, Prisma schema and seed, core booking domain (`lane-logic`, `pricing`, `tenant`), and customer booking flow foundation.
- Multi-tenant-ready `getTenant()` with `DEFAULT_TENANT_SLUG`; drift sentinel and project contracts under `.claude/`.

[Unreleased]: https://github.com/nerdwglassez/bowlingbooking/compare/ce9454b...ac7f683
[0.2.0]: https://github.com/nerdwglassez/bowlingbooking/compare/f52eb59...ce9454b
[0.1.0]: https://github.com/nerdwglassez/bowlingbooking/commit/f52eb59
