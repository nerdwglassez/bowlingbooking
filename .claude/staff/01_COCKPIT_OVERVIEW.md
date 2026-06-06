# staff/01_COCKPIT_OVERVIEW.md
# Section 1 — Cockpit Overview: stat cards, upcoming list, booking detail, check-in
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       BOOKING_DOMAIN.md Part 1
# Code contract: contracts/STAFF.md
# Wireframes:    docs/wireframes/staff/staff-app-cockpit.html,
#                docs/wireframes/staff/staff-app-v2.html,
#                docs/wireframes/staff/staff-stat-hierarchy.html
# Build status:  Built — cockpit, booking detail sheet (mobile sheet + md+ 400px panel), check-in, 5-state modification

---

## Cockpit Tab — Overview Sub-view

### Page Structure (top to bottom)
```
Staff header (persistent)
Sub-view toggle: Overview | Lanes
Context bar: "Today's bookings · [Date]"
Stat hierarchy section
Search bar
Section label: "Upcoming" or "Late — no check-in (5+ min)"
Upcoming/Late list
Walk-in FAB (floating, bottom right)
Tab bar (persistent)
```

### Sub-view Toggle
- Pill toggle: "Overview" | "Lanes"
- Position: first element inside content area, below the header
- NOT in the header — toggle lives in the content scroll area
- Container: --staff-card bg, --radius-md, border 1px --staff-border, 3px padding
- Active option: --staff-card-raised bg, #FAFAF9 text, 13px, 500 weight
- Inactive option: transparent bg, --staff-text-muted text
- Transition: background --duration-fast
- Selection persists within session (localStorage key: 'cockpit_subview')

### Context Bar
- Below toggle, above stats
- Left: "Today's bookings" label (9px uppercase, --staff-text-muted)
- Right: date string "Sat May 10" (10px, --staff-text-muted)
- No border, no card — plain text row with 16px horizontal padding

---

## Stat Hierarchy

### Layout Structure
The stat section uses a parent-children visual hierarchy,
not a flat grid of equal cards.

```
[  Total: 18  ]   ← large, prominent parent
       |           ← thin vertical connector line (1px, --staff-border)
  ┌────┴────┐
[Up: 6][Active: 4]  ← 2×2 child grid
[Done: 8][Late: 2]  ← Late only appears when count > 0
```

### Total Card (parent)
- Full width, centered
- Number: --font-display, 36px, #FAFAF9
- Label: "Total" — 11px, --staff-text-muted, uppercase
- Background: --staff-card, --radius-lg, 16px padding
- No border in normal state

### Connector
- 1px vertical line, --staff-border color
- Height: 20px
- Centered horizontally between parent and children

### Children Grid (2×2)
- Grid: 2 columns, gap 8px
- Each child card: --staff-card bg, --radius-md, 12px padding, centered
- Number: --font-display, 24px
- Label: 10px, --staff-text-muted, uppercase, 3px margin top

### Child Card Colors
- Upcoming: --palette-amber-400 (warm, attention)
- Active: --palette-green-400 (positive, in progress)
- Done: --staff-text-muted (neutral, no action needed)
- Late: --status-error-text-dark / #FCA5A5 (urgent, red)

### Late Card Behavior

**Zero late (normal operation):**
- Late card still renders in the 2×2 grid
- Number shown as 0 in --staff-text-muted (no urgency)
- No pulse, no border emphasis
- Late section label NOT shown in upcoming list

**1+ late (urgent):**
- Late card border changes to rgba(239,68,68,0.3) — subtle red
- Number pulses: opacity 1→0.5→1, 2s interval, infinite
- Pulse indicator below number: small dot + "5+ min" label
  Dot: --status-error-text-dark, 6px, pulsing
  Label: 9px, --status-error-text-dark
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
- Below stat section
- Background: --staff-card, border 1px --staff-border, --radius-md
- Padding: 9px 13px
- Search icon: 14px SVG (outline magnifier), --staff-text-muted
- Placeholder: "Search by name, phone, or code…"
- Font: 13px, --staff-text-muted

### Active / Typing State
- Border changes to --staff-border-strong
- Placeholder clears
- Text: --staff-text-primary, 13px
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
- "Upcoming" in normal state: 9px uppercase, --staff-text-muted
- "Late — no check-in (5+ min)" when late bookings exist: same size, red tint

### List Item Layout
```
[Time col] [divider] [Info col] [Right col]
```

**Time column (left, fixed width ~44px):**
- Hour: 14px, 600 weight, --staff-action (amber)
- AM/PM: 9px, --staff-text-muted, below hour

**Vertical divider:**
- 1px line, height ~80% of row, --staff-border
- Centered vertically

**Info column (flex: 1):**
- Customer name: 13px, 500 weight, --staff-text-primary
- Meta line: 11px, --staff-text-muted
  Format: "X bowlers · [Package name] · X shoe rentals"
  OR: "X bowlers · [Package name] · Shoes incl."

**Right column (fixed width):**
- Lane badge: "Ln 4" or "Ln 1–2" for multi-lane
  Background: --staff-card-raised, --radius-full
  Text: 10px, 600 weight, --staff-text-secondary
  Border: 1px --staff-border
- Status pip: 8px circle below lane badge
  Pending: --palette-amber-400
  Confirmed: --palette-green-400
  Checked in: --palette-blue-400
  Late: --status-error-text-dark, pulsing

### List Item States
- Normal: --staff-bg background (no card bg — list sits directly on page)
- Hover/press: --staff-card bg, --radius-md
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
- Tapping any upcoming list item → booking detail sheet slides up
- The cockpit content behind dims: opacity drops to ~18%
- Sheet slides up from bottom: translateY(100%)→0, --duration-base --ease-out
- Backdrop: transparent (no overlay — dimming is on content, not overlay)

---

## Booking Detail Sheet

### Trigger Points
- Tap upcoming list item
- Tap lane card in Lanes sub-view
- Tap booking block in timeline view

### Sheet Anatomy
```
Handle bar          (32×3px, centered, --staff-border-strong)
Customer name       (--font-display, 18px, --staff-text-primary)
Meta line           (12px, --staff-text-muted)
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
3. Contact: 📞 icon · label "Contact" · value in --staff-action (tappable tel: link)
4. Notes: 📝 icon · only shown if booking has notes · value is note text

Icon container: --staff-card-raised bg, 7px border radius
Label: 9px uppercase, --staff-text-muted
Value: 13px, 500 weight, --staff-text-primary (exception: contact = --staff-action)

Each row separated by 1px --staff-border bottom border
Last row: no border

### Action Buttons (3 in a row)
```
[  Check In (flex:2)  ] [ Modify ] [ Cancel ]
```

**Check In (primary, flex:2):**
- Background: --staff-action
- Text: white, 13px, 600 weight
- Border radius: --radius-md
- Padding: 12px

**Modify (secondary, flex:1):**
- Background: --staff-card-raised
- Text: --staff-text-secondary, 13px
- Border: 1px --staff-border
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
- Title: "Check in" (--font-display, 17px, --staff-text-primary)
- Sub: "Confirm the details below" (11px, --staff-text-muted)
- Separated from items by 1px --staff-border

### Checklist Items
Each item: check circle + label/sub + optional right action

**Check circle states:**
- Unchecked: 22px circle, 2px border --staff-border-strong, no fill
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
  Toast: --staff-card bg, green checkmark, 3s auto-dismiss, top center

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
- Booking detail: slides in from right as a panel (400px)
  NOT a bottom sheet on desktop
  Panel width: 400px, full viewport height
  Backdrop: --surface-dark at 20% opacity
  Slide: translateX(100%)→0

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
