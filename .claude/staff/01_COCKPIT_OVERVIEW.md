# staff/01_COCKPIT_OVERVIEW.md
# Section 1 — Cockpit Overview: stat cards, upcoming list, booking detail, check-in
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       BOOKING_DOMAIN.md Part 1
# Code contract: contracts/STAFF.md
# Visual: FIGMA.md cockpit row —
#   desktop https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1726-443880&t=w2r3hIJBDYQltPHJ-4
#   mobile  https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=1726-443918&t=w2r3hIJBDYQltPHJ-4
# Rail Dashboard vs Lane Assignments — no in-page tabs.
# Colors: Untitled semantic utilities, stock brand on dark. Do not introduce --staff-* tokens or amber remap.
# Build status:  Built — Untitled cockpit (metrics, occupancy chart, table/cards), booking detail right slideout, check-in, 5-state modification

---

## Cockpit Tab — Dashboard

### Page Structure (top to bottom)
```
StaffPageHeader (Dashboard + clock; search in header on `lg+`)
Context bar (today’s bookings + date — not Untitled 12m/30d/⌘K chrome)
Untitled remaining-day occupancy chart
Untitled metric cards (Total / Upcoming / Active / Done / Late)
Search (`< lg` only — desktop search lives in the header)
Section: "Upcoming" or "Late — no check-in (5+ min)"
Upcoming/Late list (table `lg+`, stacked avatar rows `< lg`)
Walk-in FAB (floating, bottom right)
```

Desktop frame (`lg+`): full-width chart, then metric **row**. Mobile frame (`< lg`):
chart and metrics **stack**. Do not copy Untitled dummy chrome (logo, ⌘K, Olivia,
fake revenue / activity).

Lane Assignments is a **rail destination** (`/staff?view=lanes`), not an in-page
Overview|Lanes toggle. Do not persist a dashboard subview in localStorage.

### Context Bar
- Below header, above the occupancy chart
- Left: context label (`text-sm font-medium text-secondary`)
- Right: date string (`text-sm text-tertiary`)
- No border, no card — plain text row with 16px horizontal padding

---

## Stat Hierarchy

### Layout Structure
Untitled dashboard frames use an **equal metric row** (not the older
parent-children stack). Five cards: Total, Upcoming, Active, Done, Late.

```
`lg+`  [Total] [Upcoming] [Active] [Done] [Late]   ← one row, 24px gap
`< lg` stacked full-width cards (2-col from `sm`)
```

### Total Card (parent)
- Full width, centered
- Number: --font-display, 36px, `text-primary`
- Label: "Total" — 11px, text-tertiary, uppercase
- Background: bg-primary, --radius-lg, 16px padding
- No border in normal state

### Connector
- 1px vertical line, border-secondary color
- Height: 20px
- Centered horizontally between parent and children

### Children Grid (2×2)
- Grid: 2 columns, gap 8px
- Each child card: bg-primary bg, --radius-md, 12px padding, centered
- Number: --font-display, 24px
- Label: 10px, text-tertiary, uppercase, 3px margin top

### Child Card Colors
- Upcoming: `text-brand-secondary` (Untitled brand, not amber)
- Active: --palette-green-400 (positive, in progress)
- Done: text-tertiary (neutral, no action needed)
- Late: --status-error-text-dark / #FCA5A5 (urgent, red)

### Late Card Behavior

**Zero late (normal operation):**
- Late card still renders in the 2×2 grid
- Number shown as 0 in text-tertiary (no urgency)
- No pulse, no border emphasis
- Late section label NOT shown in upcoming list

**1+ late (urgent):**
- Late card border changes to rgba(239,68,68,0.3) — subtle red
- Number pulses: opacity 1→0.5→1, 2s interval, infinite
- Pulse indicator below number: small dot + "5+ min" label
  Dot: --status-error-text-dark, 6px, pulsing
  Label: `text-xs font-medium text-error-primary`
- Late section surfaces ABOVE upcoming section in the list
  Section label: "Late — no check-in (5+ min)" in red tint
- Quick action row appears below late items (see below)

### Late Grace Period
- Bookings are NOT marked late until 5 minutes after start time
- Before 5 minutes: booking stays in "Upcoming" list normally
- At 5 minutes: booking moves to "Late" section, stat increments
- Grace period is configurable in Settings > Booking Policies
- Default: 5 minutes

---

## Search Bar

### Normal State
- `lg+`: in the page header, right side, max 280px (Untitled dashboard search — no ⌘K)
- `< lg`: below metrics, above the upcoming list
- Untitled `Input` `size="sm"` with SearchLg icon
- Placeholder: "Search by name, phone, or code…"

### Active / Typing State
- Border changes to border-primary
- Placeholder clears
- Text: text-primary, 13px
- Clear (×) button appears on right when text is present

### Results Behavior
- Filters the upcoming list inline as user types
- No new page or navigation — list updates in place
- No results state: "No bookings match '[query]'" centered in list area
- Clears when input is cleared or user taps outside
- Does NOT filter the stat cards — stats always show full day totals

---

## Upcoming List

### Section Label
- "Upcoming" in normal state: `text-sm font-medium text-secondary`
- "Late — no check-in (5+ min)" when late bookings exist: same size, red tint

### List Item Layout
```
[Time col] [divider] [Info col] [Right col]
```

**Time column (left, fixed width ~44px):**
- Hour: 14px, 600 weight, bg-brand-solid / text-brand-secondary (amber)
- AM/PM: `text-xs text-tertiary`, below hour

**Vertical divider:**
- 1px line, height ~80% of row, border-secondary
- Centered vertically

**Info column (flex: 1):**
- Customer name: 13px, 500 weight, text-primary
- Meta line: 11px, text-tertiary
  Format: "X bowlers · [Package name] · X shoe rentals"
  OR: "X bowlers · [Package name] · Shoes incl."

**Right column (fixed width):**
- Lane badge: "Ln 4" or "Ln 1–2" for multi-lane
  Background: bg-secondary, --radius-full
  Text: 10px, 600 weight, text-secondary
  Border: 1px border-secondary
- Status pip: 8px circle below lane badge
  Pending: --palette-amber-400
  Confirmed: --palette-green-400
  Checked in: --palette-blue-400
  Late: --status-error-text-dark, pulsing

### List Item States
- Normal: bg-primary (page) background (no card bg — list sits directly on page)
- Hover/press: bg-primary bg, --radius-md
- Checked-in items: full row at 50% opacity — still visible, not removed
- Late items: left border 2px --status-error-text-dark,
  name text in --status-error-text-dark, meta adds "X min late"

### Late Quick Action Row
Appears below the late items section (not below all items):
- Two buttons side by side
- "✓ Check in late arrivals": --status-available-bg tint, --status-available-text
- "✕ Cancel to free lanes": rgba(239,68,68,0.08) bg, --status-error-text-dark
- Both: 13px, 600 weight, --radius-md, 10px 14px padding
- These are shortcuts — tapping still opens the booking detail sheet
  They don't bulk-action without confirmation

### Tap to Open Booking Detail
- Tapping any upcoming list item → booking detail slideout from the right
- Overlay: `bg-overlay/70` + backdrop blur (Untitled slideout)
- Panel: full height, `translateX(100%)→0` only — never `translateY`

---

## Booking Detail Sheet

### Trigger Points
- Tap upcoming list item
- Tap lane card in Lanes sub-view
- Tap booking block in timeline view

### Sheet Anatomy
```
Handle bar          (32×3px, centered, border-primary)
Customer name       (--font-display, 18px, text-primary)
Meta line           (12px, text-tertiary)
Detail rows         (icon + label + value)
Action buttons      (3 buttons)
```

### Meta Line Format
"Confirmation RZL-XXXX · Lane X · 2:30 PM"

### Detail Rows
Each row: 28×28px icon container + label/value stack + optional right action

Row types (always shown in this order):
1. Party: 👥 icon · label "Party" · value "X bowlers · [Package] · X hrs"
2. Shoe rental: 👟 icon · label "Shoe rental" · value "X rentals · sizes X, X, X"
   OR "Included with package" if shoes are a package inclusion
3. Contact: 📞 icon · label "Contact" · value in bg-brand-solid / text-brand-secondary (tappable tel: link)
4. Notes: 📝 icon · only shown if booking has notes · value is note text

Icon container: bg-secondary bg, 7px border radius
Label: `text-sm font-medium text-secondary`
Value: 13px, 500 weight, text-primary (exception: contact = bg-brand-solid / text-brand-secondary)

Each row separated by 1px border-secondary bottom border
Last row: no border

### Action Buttons (3 in a row)
```
[  Check In (flex:2)  ] [ Modify ] [ Cancel ]
```

**Check In (primary, flex:2):**
- Background: bg-brand-solid / text-brand-secondary
- Text: white, 13px, 600 weight
- Border radius: --radius-md
- Padding: 12px

**Modify (secondary, flex:1):**
- Background: bg-secondary
- Text: text-secondary, 13px
- Border: 1px border-secondary
- Border radius: --radius-md

**Cancel (danger, flex:1):**
- Background: rgba(239,68,68,0.1)
- Text: #FCA5A5, 13px
- Border: 1px rgba(239,68,68,0.2)
- Border radius: --radius-md

### Role-Based Action Visibility
Staff role: all 3 buttons shown
  (Staff can check in and cancel but cannot issue refunds)
Manager role: all 3 buttons shown, cancel reveals refund toggle
Admin role: same as manager

### Sheet Dismiss
- Swipe down on handle bar
- Tap outside the sheet (on dimmed cockpit area)
- Sheet slides down: translateY(0)→(100%), --duration-base
- Cockpit content fades back to full opacity

---

## Check-in Checklist Flow

Triggered by tapping "Check In" in booking detail sheet.
The sheet content replaces (does not navigate) — same sheet, new content.

### Checklist Header
- Title: "Check in" (--font-display, 17px, text-primary)
- Sub: "Confirm the details below" (11px, text-tertiary)
- Separated from items by 1px border-secondary

### Checklist Items
Each item: check circle + label/sub + optional right action

**Check circle states:**
- Unchecked: 22px circle, 2px border border-primary, no fill
- Checked: 22px circle, --palette-green-500 fill, white checkmark SVG
- Transition: fill --duration-fast

**Items (always in this order):**
1. Shoe sizes — "X rentals · sizes confirmed"
   Right action: "Edit" (taps back to shoe detail)
2. Lane assignment — "Lane X confirmed"
   Right action: "Reassign" (opens lane picker)
3. Notes — "Optional — add if needed"
   Right action: "Add" (opens text input)

**Tapping an item row:** toggles check state
**Right action taps:** open sub-editors without leaving the sheet

### Confirm Button
- Appears below all items
- Full width, btn-primary style, "Confirm check-in" label
- Always active (checking items is optional — staff can confirm directly)
- On tap: booking status → ACTIVE
  Lane state → occupied
  Sheet dismisses with slide-down animation
  Toast: "Checked in · Sarah Johnson · Lane 4"
  Toast: bg-primary bg, green checkmark, 3s auto-dismiss, top center

### Back to Detail
- Back chevron in sheet header: "‹ Detail"
- Returns to booking detail sheet (sheet content swaps back)
- Checklist state is NOT preserved on back navigation

---

## Desktop Responsive Behavior (Overview Sub-view)

### Layout Changes at >1024px
- Tab bar replaced by left sidebar (220px fixed)
- Content area fills remaining width
- Stat hierarchy: horizontal row instead of vertical stack
  Total card (left, wider) → connector → children in 2×2 grid (right)
- Upcoming list becomes a table-style layout with column headers:
  Time | Customer | Package | Lanes | Status | Actions
- Booking detail: Untitled right slideout (~400px, full height) at all breakpoints
  Horizontal only: translateX(100%)→0. Overlay: bg-overlay/70

### Stat Cards (desktop)
- Displayed as a horizontal row of 5 cards (Total + 4 children)
- No connector line needed — linear hierarchy implied by order
- Total card: slightly larger, --font-display 30px
- Children: equal width, --font-display 22px

### Search Bar (desktop)
- Inline in the page header area, right side
- Width: 280px fixed
- Not below stats — repositioned to header row

---

## What Cursor Must Not Do (Overview Sub-view)

- Put the sub-view toggle (Overview/Lanes) inside the staff header
  It belongs in the content area
- Show a "Late: 0" card with red styling — zero late has muted styling
- Show the late section label when there are no late bookings
- Make the late quick action row bulk-cancel without opening a sheet first
- Remove checked-in items from the list — keep them at 50% opacity
- Use a full-page overlay/backdrop when sheet opens — dim the content only
- Navigate to a new page for booking detail — always use a sheet
- Show the Check In checklist as a new page — same sheet, swapped content
- Make the confirm check-in button disabled until all items are checked
