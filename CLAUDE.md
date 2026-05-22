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

@.claude/INTERACTION_SPEC.md
Sheet vs modal breakpoints, animation specs, hold timer states, booking flow
transitions, staff modification flow (5 states), touch targets, reduced motion.
Read this before building any interactive element.

---

## WHEN WORKING ON: Booking flow (any step)

@.claude/BOOKING_FLOW.md
6-screen flow map, progressive disclosure principle, header spec, price pill,
per-screen: what customer sees, what they do, API behavior, state carried
forward, error states, component location.

---

## WHEN WORKING ON: Database, API routes, pricing, lane logic, auth

@.claude/BOOKING_DOMAIN.md
Prisma schema, all models and enums, lane assignment rule (ceil(n/6)),
pricing logic (package flags), refund rules, availability logic,
API route structure, role permissions.

---

## WHEN WORKING ON: Staff cockpit, schedule, walk-in, check-in

@.claude/INTERACTION_SPEC.md (staff modification flow section)
@docs/wireframes/staff/staff-app-cockpit.html
@docs/wireframes/staff/walkin-booking-flow.html
@docs/wireframes/staff/schedule-calendar-blocking.html

---

## WHEN WORKING ON: Admin settings

@docs/wireframes/admin/settings-packages-unified.html
@docs/wireframes/admin/settings-booking-policies.html
@docs/wireframes/admin/settings-venue-details.html
@docs/wireframes/admin/settings-integrations.html
@docs/wireframes/admin/settings-promo-codes.html

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
Run `npm run verify` before committing (TypeScript + lint + drift + tests).

---

## ALL SPEC FILES

  AGENTS.md                     Next.js version warning — read before any framework code
  .cursorrules                  Coding standards — auto-loaded by Cursor
  .claude/DESIGN_SYSTEM.md      Visual tokens, component layers, dark mode
  .claude/INTERACTION_SPEC.md   Animations, breakpoints, sheet/modal behavior
  .claude/BOOKING_FLOW.md       6-screen booking flow, state, error handling
  .claude/BOOKING_DOMAIN.md     Schema, business logic, API routes, roles
  docs/wireframes/              HTML wireframes organized by experience