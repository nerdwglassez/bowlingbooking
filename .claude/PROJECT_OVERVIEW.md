# PROJECT_OVERVIEW.md
# Royal Z Lanes — Online Booking System

## What this is
A lane reservation system for a family-owned bowling alley.
Primary goal: reduce front desk phone burden so staff focus on in-person experience.
Built to be licensed to other bowling alleys (multi-tenant SaaS architecture).

## Tech stack
- Next.js 16.2.6 (App Router, Turbopack default) — read `node_modules/next/dist/docs/` before writing route code; see `.claude/STACK_BASELINE.md` § 7 for the breaking changes from training data
- React 19.2.4 (server actions, `useActionState`, `useFormStatus`, `use()`)
- TypeScript 5+
- Tailwind CSS v4 (CSS-first via `@theme`; layout/spacing + Untitled semantic color utilities; no raw palette classes; drift sentinel enforces this)
- 4-layer component system: `theme.css` → Untitled `base/` + `application/` → `patterns/` → pages (see DESIGN_SYSTEM.md and UNTITLED.md). `src/components/ui/` is temporary re-exports. Not shadcn/ui.
- Prisma 7.8 + PostgreSQL via `@prisma/adapter-pg` (money stored as integer cents — no `Decimal` columns)
- Stripe (payments) — Stripe API uses cents natively, so no boundary conversion
- NextAuth v5 / Auth.js (authentication; React 19 compatible) — wrapped in `src/lib/auth.ts`
- Resend (email automation; Make webhook fallback if needed)

> Source of truth for stack decisions: `.claude/STACK_BASELINE.md`. Source of truth for agent topology and contracts: `.cursor/AGENTS.md`.

## Two separate experiences

### Customer app
- Booking flow: 4 steps (party type + count → date/time → package → confirm)
- Dashboard: view/manage upcoming bookings
- Cancel and reschedule flows
- Light mode default, user can toggle dark
- Route group: app/(customer)/

### Staff + Admin app
- Staff cockpit: live lane view, active bookings, check-in
- Walk-in booking: staff creates booking at the counter
- Schedule: calendar view with lane blocking
- Reports and contacts
- Admin settings: packages, venue, policies, promos, integrations, team
- Dark mode always
- Route groups: app/(staff)/ and app/(admin)/

## Booking rules
- Max online booking: 18 bowlers (3 lanes)
- Groups > 18 are prompted to call
- Lane assignment: Math.ceil(bowlerCount / 6)
- Packages have backend flags: gameIncluded, shoesIncluded
- Pricing resolves from package flags — never hardcoded in UI

## Authentication and roles
- Roles: CUSTOMER | STAFF | MANAGER | ADMIN
- Customers land on customer dashboard after login
- Staff/Manager/Admin land on staff cockpit
- Managers can issue refunds; Staff cannot
- Admins have full settings access

## Booking hold
- A time slot is held when the customer picks a start time on the scheduling screen (`/book`)
- Hold is neutral amber (NOT green) — not confirmed until payment
- Hold expires after timeout; booking auto-cancelled

## Confirmation email must include
- QR code
- Confirmation code (display font, large)
- Cancel link (stub ok for v1)
- Reschedule link (stub ok for v1)
- Venue address linking to maps
- Booking details: date, time, lanes, bowlers, package, total

## Multi-tenant (SaaS)
- Each venue is a Tenant in the database
- Tenant has: name, slug, address, phone, logo, themeSlug, timezone, config
- getTenant() in src/lib/tenant.ts loads tenant from DB by slug
- Theme override file: src/styles/themes/{slug}.css
- Only --color-action family and --surface-dark ever change per tenant
- No component files change for a new tenant onboarding

## Key business logic files
- src/lib/lane-logic.ts    — Math.ceil(n / 6) lane assignment
- src/lib/pricing.ts       — Package flag resolver (game + shoe cost logic)
- src/lib/tenant.ts        — getTenant(), theme loader
- src/lib/auth.ts          — NextAuth config, role checks
- src/lib/stripe.ts        — Stripe singleton
- src/lib/prisma.ts        — Prisma singleton
- src/lib/email.ts         — Resend / Make webhook trigger

## Design (Figma + Untitled)
Visual SoT: Figma frames via MCP (`.claude/contracts/FIGMA.md`).
Layer 2: Untitled UI React (`src/components/base/`, `application/`, `foundations/`; see `.claude/contracts/UNTITLED.md`).
`src/components/ui/` is temporary re-exports for unreworked call sites.
`docs/wireframes/` is historical only.
