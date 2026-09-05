# Royal Z Lanes — Staff Interactions Index
# .claude/STAFF_INTERACTIONS.md
#
# Global rules and architecture for all staff/admin surfaces.
#
# How to use (every staff/admin session):
#   1. Read this file — architecture, NavRail, sheets vs panels, roles
#   2. Load the section file for the surface you are building (see table below)
#   3. Open the Figma frame for that section (FIGMA.md + UNTITLED.md) — not docs/wireframes HTML
#   4. BOOKING_DOMAIN.md — booking status, walk-in source, refund rules
#   5. contracts/STAFF.md — file locations, auth gating, server action rules
#
# Implementation status (summary):
#   BUILT:     AppShell, NavRail (Untitled accordion + Support), /staff cockpit
#              (+ ?view=lanes, ?booking= Untitled right slideout),
#              5-state booking modification (lane editor deferred), walk-in FAB (policy-gated),
#              /staff/schedule, /staff/reports (analytics + contacts, MANAGER+),
#              /staff/settings/*, /staff/support, refund panel on /staff/bookings/[id]
#   PARTIAL:   reports polish (desktop contact panel, export), customer dashboard
#              Figma parity (see CUSTOMER_DASHBOARD.md)
#   LEGACY:    /admin/* duplicate editors (packages/[id], team/new) — list routes redirect;
#              /staff/bookings/[id] kept for direct links + refunds

---

## Architecture: Two Route Groups, One Visual Experience

Staff and admin are TWO Next.js route groups sharing ONE visual shell.

```
src/app/(staff)/    — STAFF+ role required (requireRole in layout)
  staff/page.tsx          — cockpit
  staff/schedule/page.tsx
  staff/support/page.tsx  — venue contact (STAFF+)
  staff/walkin/page.tsx
  staff/bookings/[id]/page.tsx  — full detail + refunds (deep links)

src/app/(admin)/    — MANAGER+ role required (requireRole in layout)
  admin/page.tsx          — redirects → /staff/settings
  admin/packages/page.tsx — redirects → /staff/settings/packages
  admin/promos/page.tsx   — redirects → /staff/settings/packages
  admin/venue/page.tsx    — redirects → /staff/settings/venue
  admin/team/page.tsx     — redirects → /staff/settings/team
  admin/reports/page.tsx  — redirects → /staff/reports
  admin/audit/page.tsx    — ADMIN audit log (standalone)
  admin/packages/[id], admin/team/* — legacy editors (redirect cleanup open)
```

Both route groups use:
  AppShell (src/components/chrome/app-shell.tsx)
  NavRail (src/components/chrome/nav-rail.tsx)

NavRail renders:
  Fixed 280px left sidebar on `lg` and up (≥1024px)
  Hamburger + overlay drawer below `lg` (no bottom tabs)

Accordion (one section open at a time):
  Overview → Dashboard `/staff`, Lane Assignments `/staff?view=lanes`
  Scheduling → Calendar `/staff/schedule`, Reservation List `/staff/schedule?view=list`
Flat (MANAGER+): Reporting `/staff/reports`, Contacts `/staff/reports?view=contacts`
Footer (all STAFF+): Settings `/staff/settings`, Support `/staff/support`, signed-in account card

This IS the intended UX — staff and admin feel like one app
because they share the same chrome. The two route groups are for
auth gating only, not for visual separation.

Never merge (staff) and (admin) into a single route group.
Never build a separate visual chrome for admin settings.
Admin settings look and feel identical to the staff cockpit.

---

## Visual Identity

Staff and admin app: Untitled light and dark via `data-theme`, synced to
the device color scheme (`StaffThemeScope` + theme cookie). `data-app="staff"`
keeps stock Untitled brand (purple) on light staff pages.

Uses Untitled semantic utilities from `theme.css` (`bg-primary`, `text-secondary`,
`bg-brand-solid`, …). Staff dark theme uses **stock Untitled brand (purple)**.
Do not remap employee brand to amber. Customer `/book` stays light/amber.
Legacy `--color-*` / `--surface-*` aliases remain for unreworked customer patterns.

Do NOT add `--staff-*` tokens. They don't exist and would break the theme system.
Do NOT use raw Tailwind palette classes in staff/admin components.

Visual layout: Figma frames in FIGMA.md are **direct guidance** (spacing, two-column
settings, calendar chrome, charts). Compose Untitled `application/` + `base/`.
Rail URLs are the source of truth — no in-page Overview|Lanes or Analytics|Contacts tabs.

Key surfaces (Untitled names):
  bg-primary          page / card
  bg-secondary        raised panels
  text-primary / text-secondary / text-tertiary
  bg-brand-solid      primary actions

---

## NavRail — Current Implementation

The NavRail is Untitled-shaped staff chrome (Next.js `Link`, not AriaLink).
Role filtering lives in `getStaffNavTree` (`src/lib/staff-nav.ts`).

  Overview (collapsible) — Dashboard, Lane Assignments
  Scheduling (collapsible) — Calendar, Reservation List
  Reporting → `/staff/reports` (MANAGER+)
  Contacts → `/staff/reports?view=contacts` (MANAGER+)
  Settings → `/staff/settings`
  Support → `/staff/support`

If a role cannot access a route, remove it from the tree entirely.
Never pass a nav item and then show "access denied" on the page.

Do not mount Untitled `SidebarNavigationSimple` wholesale (logo, ⌘K, dummy accounts).
Do not expand Settings children in the rail — settings tabs/Select own that.

---

## Booking Detail (BUILT)

- Cockpit: `?booking=` opens `BookingDetailSheet` (`src/components/chrome/booking-detail-sheet.tsx`)
- Overlay: Untitled right slideout via `BottomSheet` (`placement="end"`, default) — full height, `translateX` only, all breakpoints
- Direct URL: `/staff/bookings/[id]/page.tsx` for refunds and deep links
- Modification: 5-state drill-in via `BookingModifySheet` (lane editor deferred per `03_MODIFICATION.md`)
- PENDING_PAYMENT: `StaffBookingOpsPanel` shows "Confirm payment received"

---

## Sheets vs Panels vs Pages

Staff overlays are Untitled **right slideouts** at every breakpoint
(Figma Slideout menus — FIGMA.md). `BottomSheet` default `placement="end"`:
full viewport height, ~400px (`w-[calc(100%-1.5rem)] max-w-[400px]`),
`slide-in-from-right` / `slide-out-to-right` only. Never combine with
`slide-in-from-bottom` (diagonal motion). Customer `/dashboard` uses
`placement="bottom"`.

  Booking detail: right slideout
  Walk-in flow: right slideout
  Modification: drill-in states inside the same slideout
  Team invite / member / pricing / integrations / sign-out / unsaved: right slideout

Desktop (`lg+`, 1024px — NavRail sidebar breakpoint):
  Settings sub-pages: full page with section tabs (`lg+`) / Select (`< lg`)

Always pages (both breakpoints):
  Settings sub-pages (/admin/*)
  Contact detail (/admin/reports — page on mobile, panel on desktop)

---

## Toast Notifications

All staff action confirmations use toasts. No inline success messages.

Position: top center mobile, top right desktop
Untitled `alerts` recipe (FeaturedIcon + CloseButton), not `--surface-*`
Success / error / info variants via Untitled color
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

| Section | File | Build status | Visual SoT |
|---------|------|--------------|------------|
| 1 — Cockpit overview, booking detail, check-in | `staff/01_COCKPIT_OVERVIEW.md` | Built (detail sheet + md+ panel + check-in) | Untitled dashboard desktop + mobile URLs in FIGMA.md |
| 2 — Lanes sub-view, walk-in FAB | `staff/02_LANES_WALKIN.md` | Built (walk-in; lane timeline partial) | Figma URL TBD |
| 3 — Booking modification, cancel | `staff/03_MODIFICATION.md` | Built (lane editor deferred) | Figma URL TBD |
| 4 — Schedule, lane blocking | `staff/04_SCHEDULE.md` | Built | Calendar + details + mobile URLs in FIGMA.md |
| 5 — Reports, analytics, contacts | `staff/05_REPORTS.md` | Built (Figma interiors ready) | Reporting + Contacts desktop URLs in FIGMA.md |
| 6 — Admin settings sub-pages | `staff/06_SETTINGS.md` | Built (Connect OAuth open; Profile Figma built; Venue + Hours interiors ready) | Profile + Venue + Hours URLs in FIGMA.md |
| 7 — Desktop responsive, PWA | `staff/07_RESPONSIVE_PWA.md` | Built chrome — Untitled sidebar 280px + hamburger `< lg`; PWA TBD | Untitled nav structure |

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
