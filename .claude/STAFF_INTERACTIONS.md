# Royal Z Lanes — Staff Interactions Index
# .claude/STAFF_INTERACTIONS.md
#
# Global rules and architecture for all staff/admin surfaces.
#
# How to use (every staff/admin session):
#   1. Read this file — architecture, NavRail, sheets vs panels, roles
#   2. Load the section file for the surface you are building (see table below)
#   3. Open the wireframe HTML listed for that section
#   4. BOOKING_DOMAIN.md — booking status, walk-in source, refund rules
#   5. contracts/STAFF.md — file locations, auth gating, server action rules
#
# Implementation status (summary):
#   BUILT:     AppShell, NavRail, /staff cockpit (+ ?booking= detail sheet),
#              /staff/schedule, walk-in FAB, /staff/reports (analytics + contacts),
#              /staff/settings/* (venue, hours, pricing, policies, packages, team,
#              integrations, profile), refund panel on /staff/bookings/[id]
#   PARTIAL:   booking modification (notes-only in sheet; date/bowlers deferred),
#              reports wireframe deltas (custom range exists; chart polish ongoing)
#   LEGACY:    /staff/bookings/[id] kept for direct links + refunds

---

## Architecture: Two Route Groups, One Visual Experience

Staff and admin are TWO Next.js route groups sharing ONE visual shell.

```
src/app/(staff)/    — STAFF+ role required (requireRole in layout)
  staff/page.tsx    — cockpit
  staff/schedule/page.tsx
  staff/walkin/page.tsx
  staff/bookings/[id]/page.tsx  ← stub, needs building

src/app/(admin)/    — MANAGER+ role required (requireRole in layout)
  admin/page.tsx          — settings root
  admin/packages/page.tsx
  admin/promos/page.tsx   ← old PromoCode UI — deprecated when Migration 4 runs
  admin/venue/page.tsx
  admin/team/page.tsx
  admin/reports/page.tsx
  admin/audit/page.tsx
```

Both route groups use:
  AppShell (src/components/chrome/app-shell.tsx)
  NavRail (src/components/chrome/nav-rail.tsx)

NavRail renders:
  Fixed left sidebar on md and up (≥768px)
  Bottom tab bar on smaller viewports

This IS the wireframe intent — staff and admin feel like one app
because they share the same chrome. The two route groups are for
auth gating only, not for visual separation.

Never merge (staff) and (admin) into a single route group.
Never build a separate visual chrome for admin settings.
Admin settings look and feel identical to the staff cockpit.

---

## Visual Identity

Staff and admin app: always dark.
data-theme="dark" is set in both (staff)/layout.tsx and (admin)/layout.tsx.

Uses the same --color-* and --surface-* semantic tokens as the customer app.
The dark theme variant of those tokens applies automatically via data-theme.

Do NOT add --staff-* tokens. They don't exist and would break the theme system.
Do NOT use raw Tailwind color classes in staff/admin components.

Key dark theme surfaces:
  --surface-ground    very dark background
  --surface-card      dark cards
  --surface-elevated  elevated dark panels
  --surface-dark      deepest dark (headers)

---

## NavRail — Current Implementation

The NavRail is already built and handles responsive nav correctly.
It accepts navItems as an array from the layout.

Staff navItems (from (staff)/layout.tsx):
  Cockpit   → /staff
  Schedule  → /staff/schedule
  Walk-in   → /staff/walkin

Admin navItems (from (admin)/layout.tsx):
  Settings  → /admin
  Packages  → /admin/packages
  Team      → /admin/team
  Reports   → /admin/reports
  Audit     → /admin/audit

Role-based nav filtering:
  If a role cannot access a route, remove it from navItems entirely.
  Never pass a navItem and then show "access denied" on the page.
  Gate in the layout before building the navItems array.

Active state: computed from currentPath prop, not client-side state.
currentPath read from x-pathname header set by src/proxy.ts.

---

## Booking Detail (STUB — needs building)

/staff/bookings/[id]/page.tsx is currently a 1-line placeholder.

When built, it should follow docs/wireframes/staff/staff-app-cockpit.html.
Load .claude/staff/01_COCKPIT_OVERVIEW.md for the full spec.

Key decisions from wireframe:
  Booking detail is a BOTTOM SHEET on mobile (slides up over cockpit)
  Booking detail is a RIGHT PANEL (400px) on desktop
  Never navigate to a new page for booking detail
  The [id] page.tsx is the fallback for direct URL access only

---

## Sheets vs Panels vs Pages

Mobile (< 768px):
  Booking detail: bottom sheet
  Walk-in flow: bottom sheet (currently implemented as inline page)
  Modification flow: bottom sheet drill-in states
  All other details: bottom sheets

Desktop (≥ 768px — NavRail sidebar breakpoint):
  Booking detail: right panel (400px)
  Walk-in flow: right panel
  Modification: within right panel
  Settings sub-pages: full page with back navigation

Always pages (both breakpoints):
  Settings sub-pages (/admin/*)
  Contact detail (/admin/reports — page on mobile, panel on desktop)

---

## Toast Notifications

All staff action confirmations use toasts. No inline success messages.

Position: top center mobile, top right desktop
Background: var(--surface-card) with dark theme applied
Success: green check icon
Error: red X icon
Auto-dismiss: 3s success, 5s error
Manual dismiss: X button

Never use browser alert(), confirm(), or prompt().

---

## Role Enforcement

Role checks happen server-side in route-group layouts.
Role checks happen in server actions (requireRole at top of every action).
Never trust client-side role claims.

If role is insufficient:
  Layout: redirect to /signin
  Server action: throw unauthorized()
  UI: hide the feature entirely — never show "access denied"

---

## Section file index

Load this index + **one** section file per session. Do not merge section
files into this index — they stay separate for focused loading.

| Section | File | Build status | Wireframes (`docs/wireframes/`) |
|---------|------|--------------|----------------------------------|
| 1 — Cockpit overview, booking detail, check-in | `staff/01_COCKPIT_OVERVIEW.md` | Partial (detail sheet via `?booking=`; check-in in sheet) | `staff/staff-app-cockpit.html`, `staff/staff-app-v2.html` |
| 2 — Lanes sub-view, walk-in FAB | `staff/02_LANES_WALKIN.md` | Built (lane timeline + walk-in) | `staff/walkin-booking-flow.html`, `staff/staff-app-cockpit.html` |
| 3 — Booking modification, cancel | `staff/03_MODIFICATION.md` | Partial (notes edit in sheet) | `staff/booking-modification-flow.html` |
| 4 — Schedule, lane blocking | `staff/04_SCHEDULE.md` | Built | `staff/schedule-calendar-blocking.html` |
| 5 — Reports, analytics, contacts | `staff/05_REPORTS.md` | Partial | `staff/reports-analytics-contacts.html` |
| 6 — Admin settings sub-pages | `staff/06_SETTINGS.md` | Partial (see checklist in section file) | `admin/settings-*.html` (see section file) |
| 7 — Desktop responsive, PWA | `staff/07_RESPONSIVE_PWA.md` | Reference | `admin/admin-pricing-team-pwa.html` |

**Domain rules** (walk-in → CONFIRMED, refunds, status machine):
`BOOKING_DOMAIN.md` Part 1 — §Booking source, §Refund rules, §Staff server actions.

**Code contract** (layouts, actions, pattern file paths):
`contracts/STAFF.md`.

---

## Global Never-Do List

- Add --staff-* CSS tokens (they don't exist)
- Use raw Tailwind color classes in staff/admin components
- Merge (staff) and (admin) route groups
- Build a separate visual chrome for admin settings
- Show "access denied" pages — redirect or hide the feature
- Remove the NavRail/AppShell from any staff or admin page
- Navigate to a new page for booking detail (use sheet/panel)
- Use browser alert(), confirm(), or prompt()
- Make walk-in bookings create in HOLD or PENDING status
  Walk-ins are CONFIRMED immediately (no Stripe hold needed)
- Show refund option to STAFF role users
- Show refund option for WALK_IN or PHONE source bookings
- Hardcode venue name, address, or phone — always getTenant()
