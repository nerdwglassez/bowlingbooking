# staff/05_REPORTS.md
# Section 5 — Reports tab, analytics, contact detail
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       BOOKING_DOMAIN.md Part 1
# Code contract: contracts/STAFF.md, contracts/ADMIN.md
# Visual: Reporting desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=104-3249
#          Contacts desktop https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=109-2437
#          See FIGMA.md apply notes. Historical HTML under docs/wireframes/ is not visual SoT.
# Colors: Untitled semantic utilities (theme.css). Do not introduce --staff-* tokens.
# Build status:  Built at `/staff/reports` + `/staff/reports/contacts/[contactId]` — Figma interiors ready (FIGMA.md)

---

## Reports Tab Overview

Visual SoT: Figma Reports (Desktop) + Contacts (Desktop) in FIGMA.md.
Keep Royal Z AppShell. Reporting and Contacts are sibling rail items (MANAGER+).
**No in-page Analytics|Contacts tabs.** Do not add Untitled ⌘K. Keep Export.

### Access
Manager and Admin roles only.
Staff role: Reports tab is hidden from navigation entirely.

### Page Structure
```
StaffPageHeader (Reports or Contacts from the rail URL)
Time period chips (analytics only)
Untitled line/bar chart + metric tiles
Package table + Export
```

### Sub-view
- `/staff/reports` is analytics only
- Contacts is the rail item (`/staff/reports?view=contacts`)
- Do not render in-page Analytics|Contacts tabs (overrides the Reports Figma header tabs)

---

## Analytics Sub-view

### Time Period Chips
- Horizontal scrolling chip strip below the toggle
- Options: "Today" | "This week" | "This month" | "Custom"
- Default: "This month"
- Active chip: rgba(245,158,11,0.08) bg, bg-brand-solid / text-brand-secondary border, bg-brand-solid / text-brand-secondary text
- Inactive: bg-primary bg, border-secondary border, text-tertiary text
- Font: 11px, 600 weight
- Padding: 6px 12px, --radius-full
- Changing period: all metrics and charts update immediately

**Custom period:**
- Tap "Custom" → inline date range picker expands below chip strip
  Start date + End date fields
  Same styling as schedule date fields
  "Apply" button activates once both dates selected

### Metrics Grid

Layout: 2-column grid, 8px gap, 16px horizontal padding.

**Revenue card (wide — spans full width):**
- grid-column: 1/-1 (spans both columns)
- Label: "Revenue" (10px uppercase, text-tertiary)
- Value: --font-display, Untitled `text-display-sm`, `text-brand-secondary`
- Delta row:
  Up: green up-arrow SVG + "+X%" in --status-available-text + "vs last [period]" in text-tertiary
  Down: red down-arrow SVG + "-X%" in --status-error-text-dark + "vs last [period]"
- Mini bar chart (below delta):
  Height: 36px total
  Bars: flex row, equal width, 3px gap
  Bar/line: Untitled `charts-base` + `fill-utility-brand-600` (not amber recipes)
  Border radius: 2px 2px 0 0
  Min height: 3px (even zero-value bars are visible)
  Bar width animates from 0 on load: height transition 0.3s
  Labels below bars: 8px, text-tertiary, centered
  Period labels: "Wk 1" / "Wk 2" etc for monthly, day names for weekly

**Bookings card:**
- Label: "Bookings"
- Value: --font-display, 26px, text-primary
- Delta: same arrow + % pattern as revenue

**Avg value card:**
- Label: "Avg value"
- Value: --font-display, 22px (slightly smaller), text-primary
- Delta: same pattern

**Busiest day card:**
- Label: "Busiest day"
- Value: --font-display, 18px, text-primary
  Day name: e.g. "Saturday"
- Sub-line: peak time window "6:00–8:00 PM peak"
  Font: 10px, text-tertiary, 5px top margin
- No delta on this card

All metric cards:
- Background: bg-primary
- Border: 1px border-secondary
- Border radius: --radius-lg
- Padding: 14px 14px 12px

### Package Breakdown Section

Below metric grid. Section label: "By package" (`text-sm font-medium text-secondary`).

Each row (one per package):
- Dot: 8px circle, distinct color per package
  (amber, green, blue, purple — each package gets a unique assignment)
- Package name: 12px, text-primary, flex:1
- Booking count: 11px, text-tertiary, margin-right 8px
- Revenue: 12px, 600 weight, bg-brand-solid / text-brand-secondary
- Bar: 60px wide, 4px tall, border-secondary bg
  Fill: bg-brand-solid / text-brand-secondary, width = % of total revenue, border-radius 2px
- Row separator: 1px border-secondary bottom border
- Last row: no border

### Promo Code Usage Section

Below package breakdown. Section label: "Promo codes" (`text-sm font-medium text-secondary`).
Only shown when at least one promo code was used in the period.

Each row:
- Code: monospace, 12px, 600 weight, text-primary, flex:1
- Uses: "X uses" — 11px, text-tertiary
- Amount saved: "−$X" — 11px, --status-error-text-dark
  (Red for promo savings — represents revenue discount)
- Row separator: same as package breakdown

### Export Button (Analytics)
- Below all metric sections
- Full width minus 32px (16px each side)
- Background: none, border 1.5px border-primary
- Text: text-secondary, 12px, 500 weight
- Icon: download arrow SVG, 13px
- Label: "Export as CSV"
- Export button is in the CONTENT AREA, not in a sub-header or page header
  (Mid-session correction from "Rebuilding" conversation)

---

## Contacts Sub-view

Visual SoT: [Contacts (Desktop)](https://www.figma.com/design/NYFCT7CV3I6j68xggeHuYi/booking_v3?node-id=109-2437)
Keep AppShell + NavRail. Do not copy Untitled dummy chrome (⌘K, Olivia). No in-page Analytics|Contacts tabs.

### Page header
- Title: "Contacts" (left)
- Actions (right): primary **Export Contacts CSV** + search input (icon, placeholder "Search", no ⌘K)
- Search filters the table as the user types (name, email, phone)
- Export downloads the filtered set, or the selected rows when checkboxes are used

### Table card
Untitled `TableCard` + `Table` (`lg+`). Card title **Contacts** with a count badge.
Filter trailing control: **All Packages** (only when contacts have booked packages — omit if none).
Do not invent CRM columns. Figma "Package Sales" label is reports leftover — product title is Contacts.

**Columns:**
- Checkbox (multi-select)
- Name — avatar initials + name + email
- Total Bookings — sortable
- Last Booking — sortable, format "Jan 11, 2027"
- Row actions — ellipsis: View details · Export CSV

**Default sort:** last booking, most recent first.

**Pagination:** Untitled card footer — page label, 10/25/50/100 per page, Previous/Next.

**Empty:** Untitled EmptyState — "No contacts yet." / `No contacts match "[query]"` / package-filter empty.

**Below `lg`:** stacked cards (avatar, name, email, bookings, last booking). Tap opens the detail slideout.

### Contact detail
Row click / View details opens `BottomSheet` `placement="end"` (right slideout) at every breakpoint — not a bottom sheet, not a 400px persistent split (Figma is full-width table). Deep link `/staff/reports/contacts/[contactId]` stays.

---

## Contact Detail Page

Tapping a contact row navigates to a full page (not a sheet).
Route: /staff/reports/contacts/[contactId]

This is one of the few places in the staff experience that uses
page navigation instead of a sheet — contact detail has enough
content to warrant a dedicated page.

### Header
- Back button: "‹ Contacts" (chevron + label)
- Centered spacer (no title — name is in the hero below)
- Staff header background: header bg-primary (purple)

### Contact Hero
- Below header, padding 20px 18px 16px
- Border bottom: 1px border-secondary
- Layout: avatar (left) + name/meta (right)

**Avatar:**
- 52×52px circle (larger than list avatar)
- bg-secondary bg, initials 18px, 600 weight

**Name and meta:**
- Name: --font-display, 19px, text-primary, line-height 1.2
- Email: 11px, bg-brand-solid / text-brand-secondary color, tappable mailto: link
- Phone: 11px, bg-brand-solid / text-brand-secondary color, tappable tel: link
- "Customer since [Month Year]": 11px, text-tertiary

### Stats Row
3-column equal grid, below hero.

Each stat:
- Value: --font-display, varies by content
  Bookings count: 22px, text-primary
  Total spent: 22px, bg-brand-solid / text-brand-secondary (money is always amber)
  Avg booking: 18px, text-primary
- Label: 10px, text-tertiary, margin-top 3px

### Export Button (Contact Detail)
- Below stats row, above booking history
- Label: "Export booking history as CSV"
- Same styling as other export buttons
- Scoped to this contact's history only

### Booking History Section
Section label: "Booking history" (`text-sm font-medium text-secondary`).

Each history item:

**Top row:**
- Date + time: "Fri May 16 · 6:00 PM" — 11px, text-tertiary
- Amount: "$864" — 12px, 600 weight, text-primary, right-aligned

**Detail row (tags):**
- Flex wrap row of small tags
- Tag: bg-primary bg, 1px border-secondary, --radius-full, 10px, text-tertiary
  Padding: 2px 8px
- Tag content: bowler count, package name, lane(s)
- Status tag (right of detail row):
  Upcoming: --status-info-bg, --status-info-text, --status-info-border
  Completed: --status-neutral-bg, --status-neutral-text
  Cancelled: --status-critical-bg, --status-critical-text

**Tapping a history item:**
- Drills into booking detail **in the same slideout** (back returns to the contact).
  Do not navigate to `/staff/bookings/[id]`.
- Sheet close (X / overlay) dismisses the whole panel.
- Booking actions stay context-aware:
  Upcoming booking: Check In · Modify · Cancel
  Completed booking: "Issue refund" replaces "Cancel" (Manager+ only, if eligible)
  Cancelled booking: read-only, no actions

---

## Desktop Reports Behavior

- Analytics: metrics grid expands to 3 columns (revenue still wide)
- Mini bar charts: wider, more bars visible
- Contacts: full-width Untitled table (Figma). Detail is a right slideout, not an inline 400px column
- Export Contacts CSV lives in the page header (Figma); analytics export stays in the content area

---

## What Cursor Must Not Do (Reports Tab)

- Show the Reports tab to Staff role users
- Put the analytics export button in a sub-header or page header —
  analytics export stays in the content area. Contacts export is in the
  page header (Figma: Export Contacts CSV)
- Put the Analytics/Contacts toggle in the staff header
  It belongs below the page title in the content area
- Navigate away from the contacts table for detail on desktop —
  use the right slideout; keep `/staff/reports/contacts/[id]` for deep links only
- Show promo code section when no promo codes were used in the period
- Make booking history items non-tappable — they open the booking detail sheet
- Use the same color for all packages in the breakdown — each gets a distinct color
- Show "Issue refund" for cancelled bookings that were already refunded


## Metric dictionary (backend SoT)

Canonical definitions live in `src/lib/staff-report-metrics.ts` and are consumed by
`getStaffAnalyticsSummary` / `exportStaffAnalyticsCsvAction` in `src/lib/actions/staff-reports.ts`.

| Metric | Definition |
|--------|------------|
| **Gross revenue** | Sum of `Booking.totalAmount` for `CONFIRMED`/`COMPLETED` bookings with captured payment (`Payment.status` in `succeeded` \| `cash`) whose `startTime` falls in the window. Integer cents. |
| **Refund total** | Sum of `Payment.refundAmount` where `refundStatus = SUCCEEDED` for bookings in the same window. |
| **Net revenue** | `max(0, gross − refund total)`. |
| **Booking count** | Count of paid CONFIRMED/COMPLETED bookings in the window (same filter as gross). |
| **Avg value** | `floor(gross / booking count)` (0 when count is 0). |
| **No-show rate** | `NO_SHOW / (CONFIRMED + COMPLETED + NO_SHOW)` × 100, one decimal. |
| **Source mix** | Paid booking counts + revenue by `Booking.source` (`ONLINE` \| `WALK_IN` \| `PHONE`). |
| **Lane utilization inputs** | Pure helpers: booked lane-minutes / (lanes × operating minutes). UI may adopt later. |

### Timezone windows

Period chips resolve with `resolveStaffReportsWindowInTimezone` using `Tenant.timezone`
(IANA). Daily chart buckets use zoned `YYYY-MM-DD` keys — not UTC midnight.

### CSV export + audit

`exportStaffAnalyticsCsvAction` (MANAGER+) returns CSV text + filename and writes
`AuditLog` action `REPORT_EXPORTED` with period/window/timezone details. Browser-only
Blob download may still exist in UI; prefer the server action for audited exports.

### Access

MANAGER and ADMIN only. STAFF cannot call analytics/contacts/export actions
(`requireRole('MANAGER', 'ADMIN')` + `assertStaffTenantAccess`).
