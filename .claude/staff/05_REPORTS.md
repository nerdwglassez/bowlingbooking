# staff/05_REPORTS.md
# Section 5 — Reports tab, analytics, contact detail
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       BOOKING_DOMAIN.md Part 1
# Code contract: contracts/STAFF.md, contracts/ADMIN.md
# Wireframes:    docs/wireframes/staff/reports-analytics-contacts.html
# Build status:  Built at `/staff/reports` + `/staff/reports/contacts/[contactId]` — polish items below remain

---

## Reports Tab Overview

### Access
Manager and Admin roles only.
Staff role: Reports tab is hidden from navigation entirely.

### Page Structure
```
Staff header (persistent)
Page title "Reports" + sub-view toggle
Time period chips (Analytics sub-view only)
Content area (Analytics or Contacts)
Tab bar (persistent)
```

### Sub-view Toggle
- Same pill toggle pattern as cockpit: "Analytics" | "Contacts"
- Position: below "Reports" page title, inside content area
  NOT in the staff header
- Container: --staff-card bg, --radius-md, border 1px --staff-border, 3px padding
- Active option: --staff-card-raised bg, --staff-text-primary, 12px, 600 weight
- Inactive: transparent, --staff-text-muted
- Persists selection within session

---

## Analytics Sub-view

### Time Period Chips
- Horizontal scrolling chip strip below the toggle
- Options: "Today" | "This week" | "This month" | "Custom"
- Default: "This month"
- Active chip: rgba(245,158,11,0.08) bg, --staff-action border, --staff-action text
- Inactive: --staff-card bg, --staff-border border, --staff-text-muted text
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
- Label: "Revenue" (10px uppercase, --staff-text-muted)
- Value: --font-display, 26px, --staff-action (amber — revenue is always amber)
- Delta row:
  Up: green up-arrow SVG + "+X%" in --status-available-text + "vs last [period]" in --staff-text-muted
  Down: red down-arrow SVG + "-X%" in --status-error-text-dark + "vs last [period]"
- Mini bar chart (below delta):
  Height: 36px total
  Bars: flex row, equal width, 3px gap
  Bar color: rgba(245,158,11,0.25) — muted amber
  Highlight bar (current/most recent): --staff-action (full amber)
  Border radius: 2px 2px 0 0
  Min height: 3px (even zero-value bars are visible)
  Bar width animates from 0 on load: height transition 0.3s
  Labels below bars: 8px, --staff-text-muted, centered
  Period labels: "Wk 1" / "Wk 2" etc for monthly, day names for weekly

**Bookings card:**
- Label: "Bookings"
- Value: --font-display, 26px, --staff-text-primary
- Delta: same arrow + % pattern as revenue

**Avg value card:**
- Label: "Avg value"
- Value: --font-display, 22px (slightly smaller), --staff-text-primary
- Delta: same pattern

**Busiest day card:**
- Label: "Busiest day"
- Value: --font-display, 18px, --staff-text-primary
  Day name: e.g. "Saturday"
- Sub-line: peak time window "6:00–8:00 PM peak"
  Font: 10px, --staff-text-muted, 5px top margin
- No delta on this card

All metric cards:
- Background: --staff-card
- Border: 1px --staff-border
- Border radius: --radius-lg
- Padding: 14px 14px 12px

### Package Breakdown Section

Below metric grid. Section label: "By package" (9px uppercase, --staff-text-muted).

Each row (one per package):
- Dot: 8px circle, distinct color per package
  (amber, green, blue, purple — each package gets a unique assignment)
- Package name: 12px, --staff-text-primary, flex:1
- Booking count: 11px, --staff-text-muted, margin-right 8px
- Revenue: 12px, 600 weight, --staff-action
- Bar: 60px wide, 4px tall, --staff-border bg
  Fill: --staff-action, width = % of total revenue, border-radius 2px
- Row separator: 1px --staff-border bottom border
- Last row: no border

### Promo Code Usage Section

Below package breakdown. Section label: "Promo codes" (9px uppercase, --staff-text-muted).
Only shown when at least one promo code was used in the period.

Each row:
- Code: monospace, 12px, 600 weight, --staff-text-primary, flex:1
- Uses: "X uses" — 11px, --staff-text-muted
- Amount saved: "−$X" — 11px, --status-error-text-dark
  (Red for promo savings — represents revenue discount)
- Row separator: same as package breakdown

### Export Button (Analytics)
- Below all metric sections
- Full width minus 32px (16px each side)
- Background: none, border 1.5px --staff-border-strong
- Text: --staff-text-secondary, 12px, 500 weight
- Icon: download arrow SVG, 13px
- Label: "Export as CSV"
- Export button is in the CONTENT AREA, not in a sub-header or page header
  (Mid-session correction from "Rebuilding" conversation)

---

## Contacts Sub-view

### Search Bar
- Full width minus 32px, below sub-view toggle
- Background: --staff-card, border 1px --staff-border, --radius-md
- Padding: 9px 13px
- Search icon: 13px, --staff-text-muted
- Placeholder: "Search contacts…"
- Default opacity: 45% (collapsed/inactive state visually)
- On tap: opacity 1, cursor active, keyboard opens

**Search behavior:**
- Filters contact list inline as user types
- Searches: name, email, phone
- No-results state: "No contacts match '[query]'" centered in list area

### Contact Count
- Below search bar, above list
- "X contacts · sorted by last booking"
- Font: 11px, --staff-text-muted
- Padding: 10px 16px 4px

### Contact List

Each row:
```
[Avatar] [Info column] [Booking count] [Chevron]
```

**Avatar:**
- 36×36px circle, --staff-card-raised bg
- Initials: 12px, 600 weight, --staff-text-secondary
- flex-shrink: 0

**Info column (flex:1):**
- Name: 13px, 500 weight, --staff-text-primary
- Detail line: 10px, --staff-text-muted, line-height 1.4
  Format: "email@domain.com · (XXX) XXX-XXXX"
  Second line: "Last booking [Month Day]"

**Booking count (right, flex-shrink 0):**
- Count number: 11px, 600 weight, --staff-text-primary, text-align right
- "bookings" label: 9px, --staff-text-muted, margin-top 1px

**Chevron:**
- › symbol, --staff-text-muted, 12px, margin-left 4px

**Row:**
- Padding: 11px 0
- Border bottom: 1px --staff-border
- Last row: no border
- Cursor: pointer

**Default sort:** last booking date (most recent first)

### Export Button (Contacts)
- Same styling as Analytics export button
- Label: "Export contacts as CSV"
- Position: below the contact list (not above)
- (Mid-session correction — export button moved out of sub-header into content area)

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
- Staff header background: --staff-header (purple)

### Contact Hero
- Below header, padding 20px 18px 16px
- Border bottom: 1px --staff-border
- Layout: avatar (left) + name/meta (right)

**Avatar:**
- 52×52px circle (larger than list avatar)
- --staff-card-raised bg, initials 18px, 600 weight

**Name and meta:**
- Name: --font-display, 19px, --staff-text-primary, line-height 1.2
- Email: 11px, --staff-action color, tappable mailto: link
- Phone: 11px, --staff-action color, tappable tel: link
- "Customer since [Month Year]": 11px, --staff-text-muted

### Stats Row
3-column equal grid, below hero.

Each stat:
- Value: --font-display, varies by content
  Bookings count: 22px, --staff-text-primary
  Total spent: 22px, --staff-action (money is always amber)
  Avg booking: 18px, --staff-text-primary
- Label: 10px, --staff-text-muted, margin-top 3px

### Export Button (Contact Detail)
- Below stats row, above booking history
- Label: "Export booking history as CSV"
- Same styling as other export buttons
- Scoped to this contact's history only

### Booking History Section
Section label: "Booking history" (9px uppercase, --staff-text-muted).

Each history item:

**Top row:**
- Date + time: "Fri May 16 · 6:00 PM" — 11px, --staff-text-muted
- Amount: "$864" — 12px, 600 weight, --staff-text-primary, right-aligned

**Detail row (tags):**
- Flex wrap row of small tags
- Tag: --staff-card bg, 1px --staff-border, --radius-full, 10px, --staff-text-muted
  Padding: 2px 8px
- Tag content: bowler count, package name, lane(s)
- Status tag (right of detail row):
  Upcoming: --status-info-bg, --status-info-text, --status-info-border
  Completed: --status-neutral-bg, --status-neutral-text
  Cancelled: --status-critical-bg, --status-critical-text

**Tapping a history item:**
- Opens booking detail sheet (same sheet as cockpit)
- Sheet actions are context-aware:
  Upcoming booking: Check In · Modify · Cancel
  Completed booking: "Issue refund" replaces "Cancel" (Manager+ only, if eligible)
  Cancelled booking: read-only, no actions

---

## Desktop Reports Behavior

- Analytics: metrics grid expands to 3 columns (revenue still wide)
- Mini bar charts: wider, more bars visible
- Contacts: list and detail side-by-side (list left, detail right panel)
  Detail panel: 400px, slides in from right when contact tapped
  No page navigation on desktop — panel pattern
- Export buttons remain in content area at same position

---

## What Cursor Must Not Do (Reports Tab)

- Show the Reports tab to Staff role users
- Put the export button in a sub-header or page header area
  Export belongs in the content area, below the relevant data
- Put the Analytics/Contacts toggle in the staff header
  It belongs below the page title in the content area
- Navigate to a new page for contact detail on desktop —
  use a right panel on desktop, page navigation only on mobile
- Show promo code section when no promo codes were used in the period
- Make booking history items non-tappable — they open the booking detail sheet
- Use the same color for all packages in the breakdown — each gets a distinct color
- Show "Issue refund" for cancelled bookings that were already refunded
