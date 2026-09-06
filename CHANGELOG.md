# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


### Security

- Tenant-scope audit logs (`AuditLog.tenantId` + backfill); `listAuditLogs` filters by session tenant (platform ADMIN with null tenantId remains global).
- Staff reports and payment-resume links bind to the caller’s tenant; mismatched client `tenantId` values are rejected.
- Lane block/unblock server actions require ADMIN (UI was already Admin-only).

### Added

- `staffCancelBookingAction`: STAFF+ can cancel; optional Stripe refund only for MANAGER+; audited + customer email.
- Staff report metrics module (`staff-report-metrics`): gross/net revenue, source mix, no-show rate, tenant-timezone windows.
- `exportStaffAnalyticsCsvAction` (MANAGER+) with `REPORT_EXPORTED` audit trail.
- Stripe Connect destination-charge path behind `STRIPE_CONNECT_DESTINATION_CHARGES` (default off) in `stripe.ts`.
- Staff Contacts table (Untitled `TableCard` + right slideout), Support venue contacts from `getTenant()`, booking-detail payment-resume control, and packages search/sort.
- Installable staff + customer PWAs: dynamic `/manifest-staff.json` and `/manifest-customer.json` (tenant name, `display: standalone`), Apple `apple-mobile-web-app-capable` meta, and home-screen icons.

### Changed

- Staff server actions split into domain modules (`staff-cockpit`, `staff-schedule`, `staff-walkin`, `staff-booking-ops`) over `staff-impl`; public import remains `@/lib/actions/staff`.
- Staff/admin contracts and `05_REPORTS` metric dictionary aligned with shipped MANAGER+ `/staff/reports` behavior.
- Documented host→tenant routing roadmap in `STACK_BASELINE` (still env-slug today).
- Reports rail URLs are the source of truth (no in-page Analytics|Contacts toggle); analytics shows net revenue + source mix.

### Added

- Unified staff employee portal: cockpit with booking detail sheet (mobile sheet / desktop 400px panel), schedule with lane blocking, walk-in FAB, reports (analytics + contacts, MANAGER+), and shared AppShell + NavRail chrome.
- Canonical manager settings under `/staff/settings/*`: venue, operating hours, pricing periods, booking policies, unified packages (PUBLIC / code-gated tabs), team invite/detail sheets, integrations status, and profile/password.
- Schema migrations 1–7: policy snapshots on bookings, consent fields, package `inclusions` and `CODE_REQUIRED` columns, `PricingPeriod`, `ClaimToken`, and `PENDING_PAYMENT` booking status.
- Customer booking funnel through `/book/details` (shoe sizing) with hold timer and CTA-only footers on steps 2–4; remove-bowler on details.
- CODE_REQUIRED packages: special-code unlock on the package step, offline `PAYMENT_OFFLINE` checkout → `PENDING_PAYMENT`, and staff “Confirm payment received” action.
- Customer `/dashboard` with cancel/reschedule bottom sheets (policy snapshots); guest self-serve remains at `/find-my-booking`.
- Success-page account claim via `ClaimToken`; confirmation email includes manage, dashboard, and calendar links with optional venue `reply_to`.
- Staff 5-state booking modification (date/time, bowlers, package, notes); walk-in FAB gated by `allowWalkInBookings` policy.
- Tenant pricing domain: strategy-based totals, pricing-period overrides, booking duration limits, and `bowlersPerLane` via `getLaneCount()`.
- Staff check-in, mark completed, and mark no-show actions; online bookings persist `BookingBowler` rows and `BookingLane` assignments at webhook finalize.
- Settings UX: toast provider, unsaved-form guard, sign-out confirm sheet, and legacy `/admin/*` list routes redirecting to `/staff/settings/*`.
- Project changelog (`CHANGELOG.md`), `/changelog` Cursor skill, and Cursor rule for Keep a Changelog updates.
- Crypto-backed booking confirmation codes with collision retry; role-aware sign-in redirects and configurable home entry (`NEXT_PUBLIC_HOME_ENTRY`).

### Changed

- Prisma ORM upgraded to **7.8** — `prisma.config.ts`, `prisma-client` generator (`src/generated/prisma`), `@prisma/adapter-pg` + `pg` driver adapter; removed v6 version pins and Dependabot major-ignore rules.
- Customer booking flow: purple `BookingFlowShell` chrome, 4-step indicator, neutral hold bar, CTA-only sticky footers (no price breakdown in footer).
- Success page: conf header, dismissible celebration banner, icon detail rows, updated account prompt.
- Customer dashboard: "Welcome back" greeting, profile icon, featured/secondary card structure per wireframe.
- Policy settings promoted from `Tenant.config` JSON to typed tenant columns; cancel, refund, and dashboard self-serve read booking snapshot fields, not live tenant settings.
- Customer cancel aligns refund `isRefunded` timing with Stripe webhook (staff path).
- `confirmBooking` validates optional add-ons server-side; PaymentIntent metadata carries shoes, add-ons, and consent.
- Promo codes contract renamed to `PROMO_CODES_DEPRECATED.md`; target model is CODE_REQUIRED packages (legacy `PromoInput` at confirm retained until cleanup).
- Price display helpers extracted to client-safe `@/lib/format-price` for settings and reports UI.
- Hide cockpit payment resume panel pending UX redesign; `createPaymentResumeLink` and `/book/resume-payment` remain available for existing links.

### Fixed

- Stripe `payment_intent.succeeded` retries now replay booking finalization when the event was recorded but no Payment row exists, so a webhook timeout cannot capture a payment without creating the reservation.
- PaymentIntent idempotency key fingerprints amount + metadata so promo/package changes on confirm no longer block checkout.
- Customer cancel caps refunds by remaining policy amount after settled partials (no double payout on retry).
- Customer reschedule preserves original paid duration; end time is derived server-side.
- Peak pricing periods match clock windows; unmatched overrides fall through to the tenant default rate.
- Online booking rejects time slots that have already started.
- Card confirmation success URL includes `payment_intent` so `/book/success` can resolve the booking.
- Account claim signs the customer in before redirecting to `/dashboard`.
- Dashboard treats future `PENDING_PAYMENT` as upcoming and includes cancelled bookings in past history.
- Outside self-serve window badge no longer mislabels the booking as a large group.
- Confirmation email used venue name instead of package name.
- Online checkout failed when optional package add-ons were selected.
- `maxOnlineBowlers` tenant setting ignored on booking Step 1 UI.
- Settings layout crash when Lucide icons were passed through client/server layout props.
- Vercel production build failure from server-only imports in client settings and reports components.
- `Button` with `asChild` passes a single child to Radix `Slot`, fixing a runtime crash on link-styled buttons.
- `/api/health` dev-mock response when the database is unreachable.

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

[Unreleased]: https://github.com/nerdwglassez/bowlingbooking/compare/ce9454b...4c4e8e2
[0.2.0]: https://github.com/nerdwglassez/bowlingbooking/compare/f52eb59...ce9454b
[0.1.0]: https://github.com/nerdwglassez/bowlingbooking/commit/f52eb59
