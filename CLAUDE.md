# CLAUDE.md
# Royal Z Lanes — Master Context Index
#
# Cursor reads this file automatically every session.
# All specification files are listed below with their purpose.
# Read every file in the ALWAYS section before writing any code.
# Read the relevant files in the WHEN WORKING ON section for the feature at hand.

---

## ALWAYS READ THESE FIRST

@AGENTS.md
Framework version warning. This is Next.js 16 with breaking changes from prior
versions. Read node_modules/next/dist/docs/ before writing any Next.js code.
Heed all deprecation notices.

@.cursorrules
Coding standards, token usage rules, component folder structure, button
variants, Shadcn rules, venue constant rules. Auto-loaded by Cursor but
read again whenever you are uncertain about a pattern.

@.claude/DESIGN_SYSTEM.md
Visual token system, component layers, dark mode rules, Tailwind v4 policy,
typography, radius, shadows. Read this before touching any component or style.

@.claude/BOOKING_INTERACTIONS.md
Customer booking flow UX: hold timer, step transitions, price footer,
sheet behavior, promo field placement, toasts, loading states.
Read before building any customer booking step.

@.claude/STAFF_INTERACTIONS.md
Staff/admin global rules: AppShell + NavRail, sheets vs panels, dark theme,
route group architecture. Read before building any staff or admin surface.
Also load the relevant .claude/staff/0N_*.md for the surface at hand.

---

## WHEN WORKING ON: Booking flow (any step)

@.claude/BOOKING_DOMAIN.md
Part 1 — current schema, business rules, status machine, pricing, refunds.
Part 2 — planned wireframe decisions (check SCHEMA_MIGRATIONS before building).

@.claude/BOOKING_INTERACTIONS.md
Per-step interaction behavior, animation, hold timer, price footer, error states.

---

## WHEN WORKING ON: Database, API routes, pricing, lane logic, auth

@.claude/BOOKING_DOMAIN.md
Prisma schema, all models and enums, lane assignment rule (ceil(n/6)),
pricing logic (package flags), refund rules, availability logic,
server actions, role permissions.

@.claude/SCHEMA_MIGRATIONS.md
Planned Prisma migrations in dependency order. Read before touching
schema.prisma or implementing any Part 2 feature from BOOKING_DOMAIN.md.

---

## WHEN WORKING ON: Staff cockpit, schedule, walk-in, check-in

@.claude/STAFF_INTERACTIONS.md
Global staff/admin architecture, section index, NavRail, sheets vs panels.

@.claude/BOOKING_DOMAIN.md
Walk-in source, booking status, refund rules, staff server actions.

@.claude/contracts/STAFF.md
File locations, layout auth gating, pattern vs chrome rules.

Load **one** section file for the surface at hand:
@.claude/staff/01_COCKPIT_OVERVIEW.md — cockpit, booking detail, check-in
@.claude/staff/02_LANES_WALKIN.md — lanes sub-view, walk-in
@.claude/staff/03_MODIFICATION.md — modification, cancel
@.claude/staff/04_SCHEDULE.md — schedule, lane blocking

@docs/wireframes/staff/staff-app-cockpit.html
@docs/wireframes/staff/walkin-booking-flow.html
@docs/wireframes/staff/schedule-calendar-blocking.html

---

## WHEN WORKING ON: Admin settings

@.claude/STAFF_INTERACTIONS.md
Global admin chrome (same shell as staff).

@.claude/staff/06_SETTINGS.md
@.claude/contracts/ADMIN.md
@docs/wireframes/admin/settings-packages-unified.html
@docs/wireframes/admin/settings-booking-policies.html
@docs/wireframes/admin/settings-venue-details.html
@docs/wireframes/admin/settings-integrations.html
@docs/wireframes/admin/settings-promo-codes.html

---

## WHEN WORKING ON: Customer dashboard, cancel/reschedule

@.claude/CUSTOMER_DASHBOARD.md
Dashboard layout, featured booking card, cancel/reschedule sheets,
preferences, account creation flow. NOT YET BUILT — target design.

@.claude/BOOKING_DOMAIN.md
Part 2 §Customer Dashboard — dependencies (Migration 1 + 7).

---

## WHEN WORKING ON: Multi-tenant / new venue onboarding

@.claude/DESIGN_SYSTEM.md (tenant theme override section)
@.claude/BOOKING_DOMAIN.md (Tenant model section)
Only --color-action, --color-action-hover, --color-action-dark, --surface-dark
ever change per tenant. No component files change for a rebrand.

---

## WIREFRAME REFERENCE

Always check docs/wireframes/ for the screen you are building.
Open the HTML file in a browser — it is the visual and state spec.
Wireframes use the same token system as production code.

  docs/wireframes/customer/    booking steps, dashboard, cancel/reschedule
  docs/wireframes/staff/       cockpit, walk-in, schedule, reports
  docs/wireframes/admin/       all settings screens

---

## PROJECT OVERVIEW

Bowling alley lane reservation system. Family business, built to license to
other venues. Two experiences: customer booking flow and staff/admin app.

Tech stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · Shadcn/ui ·
Prisma + PostgreSQL · Stripe · NextAuth v5 · Resend · Vitest

Venue constants — NEVER hardcode, always import from lib/venue.ts:
  VENUE_NAME     'Royal Z Lanes'
  VENUE_ADDRESS  '8512 Two Notch Rd Columbia, SC 29223'

Run `npm run drift` after every agent session to catch token violations.
Run `npm run verify` before committing (TypeScript + lint + drift + audit + tests).
Run `/security-review` before merging auth, payment, webhook, or new public server-action changes.

---

## ALL SPEC FILES

  AGENTS.md                              Next.js version warning — read before any framework code
  .cursorrules                           Coding standards — auto-loaded by Cursor
  .claude/STACK_BASELINE.md              Frozen stack decisions, Next.js 16 API notes
  .claude/DESIGN_SYSTEM.md               Visual tokens, component layers, dark mode
  .claude/BOOKING_DOMAIN.md              Schema, business logic, server actions, roles
  .claude/BOOKING_INTERACTIONS.md        Customer booking flow UX and interaction rules
  .claude/STAFF_INTERACTIONS.md          Staff/admin global architecture and UX rules
  .claude/staff/0N_*.md                  Staff surface-specific interaction specs
  .claude/CUSTOMER_DASHBOARD.md          Customer post-booking dashboard (target design)
  .claude/SCHEMA_MIGRATIONS.md           Planned Prisma migrations — gates Part 2 features
  .claude/contracts/*.md                 Surface-specific contracts (PAYMENTS, STAFF, SECURITY, etc.)
  docs/wireframes/                       HTML wireframes organized by experience
