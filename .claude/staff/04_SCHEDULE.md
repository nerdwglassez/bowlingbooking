# staff/04_SCHEDULE.md
# Section 4 — Schedule tab, calendar, lane blocking
#
# Prerequisite: STAFF_INTERACTIONS.md (global architecture)
# Domain:       BOOKING_DOMAIN.md Part 1 (§Lane availability, BlockedSlot)
# Code contract: contracts/STAFF.md
# Visual: Figma frames in FIGMA.md —
#   Desktop calendar https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=7720-19525&t=w2r3hIJBDYQltPHJ-4
#   Reservation details https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=7720-19792&t=w2r3hIJBDYQltPHJ-4
#   Mobile calendar https://www.figma.com/design/BYKelzNYd141jdsvslOABk/%E2%9D%96-Untitled-UI-Figma-%E2%80%93-PRO-STYLES--v8.0--KTWJ8mYFqVpN--Copy-?node-id=7720-19824&t=w2r3hIJBDYQltPHJ-4
# Occupancy overlays stay domain-owned.
# Colors: Untitled semantic utilities, stock brand on dark. Occupancy uses brand/success/error — not amber.
# Build status:  Built (/staff/schedule, blockLanes / unblockLanes)

---

## Schedule Tab Overview

### Access
All roles: Staff, Manager, Admin can view the Schedule tab.
Only Admin can create, edit, or delete lane blocks.
Staff and Manager see blocks as read-only.

### Page Structure
```
StaffPageHeader
Untitled Calendar chrome (prev / Today / next, Month view, Block = Add event)
Month occupancy grid (event chips on desktop, dots on mobile)
Day reservation listing (below the calendar at every breakpoint)
Reservation details: BottomSheet placement="end" (right slideout)
```

Reservation List is a **rail destination** (`/staff/schedule?view=list`), not an
in-page Calendar|List tab. Do not duplicate Reporting inside the calendar.

---

## Calendar View (default)

### Month Navigation
- Centered row: ‹ chevron · "May 2026" · › chevron
- Month label: --font-display, 16px, text-primary
- Chevron buttons: 16px SVG, text-tertiary, tappable
- Changing month: calendar grid updates, day detail clears

### Day-of-week Header Row
- 7 columns: Su Mo Tu We Th Fr Sa
- Font: 10px, 600 weight, text-tertiary, centered
- Padding: 4px 0

### Calendar Grid
- 7-column grid, 3px gap
- Each cell: aspect-ratio 1:1, --radius-sm

**Day cell states:**

Normal (current month, no blocks):
- No background
- Hover: bg-primary bg
- Day number: 11px, 600 weight, text-secondary

Today:
- Background: rgba(245,158,11,0.08)
- Border: 1px rgba(245,158,11,0.25)
- Day number: bg-brand-solid / text-brand-secondary color

Selected:
- Background: bg-brand-solid / text-brand-secondary
- Day number: white, 11px, 600 weight

Other month (leading/trailing days):
- Full cell: 20% opacity
- Day number: text-tertiary

Partially blocked (some lanes blocked):
- Background: rgba(239,68,68,0.07)
- Border: 1px rgba(239,68,68,0.15)
- Red block dot: 4×4px circle, --status-error-text-dark,
  positioned absolute bottom-right (3px from each edge)

Fully blocked (all lanes / whole venue):
- Background: rgba(239,68,68,0.12)
- Border: 1px rgba(239,68,68,0.25) — slightly stronger than partial
- Red block dot: same as partially blocked

### Density Bar
- Thin bar below day number: width calc(100% - 4px), height 3px, --radius-sm
- Base: border-secondary color (empty)
- Fill: colored bar showing booking density as % of capacity

Fill colors by occupancy:
- Low (< 50% full): --palette-green-500
- Busy (50–89% full): `bg-brand-solid` / `text-brand-secondary` (Untitled brand)
- Full (≥ 90% full): --status-error-text-dark (red)
- Transition: width 0.3s (animates on load)

### Day Tap Behavior
- Tap any day → day detail panel updates below calendar
- Selected day gets bg-brand-solid / text-brand-secondary background
- Previous selection deselects
- Day detail slides up with content: translateY(8px)→0, opacity 0→1, --duration-base

---

## Day Detail Panel

Sits below the calendar inside the same card, separated by a 1px border-secondary divider.
Always visible — shows current or today's listing by default. Tapping a reservation
opens the details slideout (`BottomSheet` `placement="end"`).

### Day Detail Header
- Date title matching mobile frame 7720:19824 ("Friday, Jan 8, 2027")
- Block CTA lives in calendar chrome (ADMIN only), not in this listing header

### Booking Slot List
Time-sorted list of all bookings for the selected day.

**Standard booking slot:**
- Background: bg-primary, --radius-md, 1px border-secondary
- Padding: Untitled density (`px-3 py-2.5`)
- Time: --font-display, 13px, text-primary, min-width 52px
- Customer name: 12px, 600 weight, text-primary
- Meta: 10px, text-tertiary — "X bowlers · [Package]"
- Status pip: 8px circle, right side

**Blocked slot (lane block):**
- Background: rgba(239,68,68,0.05)
- Border: rgba(239,68,68,0.2)
- Label: block name (e.g. "League night setup")
- Meta: "Lanes 5–8" or "All lanes"
- No customer name, no status pip
- Edit icon: right side, text-tertiary (Admin only)

**Tapping a booking slot:**
- Opens reservation details slideout (Figma 7720:19792 — customer, time, lanes, package, status, bowlers)
- Calendar stays visible behind the slideout
- Desktop and mobile: right slideout (`slide-in-from-right` only, ~400px, 24px peek on small screens)

**Tapping a blocked slot (Admin only):**
- Opens block edit sheet

---

## Blocked Times List View

Activated by tapping the list icon in the view toggle.

### Page Structure
```
Staff header
Page title "Schedule" + view toggle (list active)
Month navigation (filters list by month)
"Add block" button
Section: Upcoming
Block items list
Section: Past (at 45% opacity)
Past block items
Tab bar
```

### Add Block Button
- Full width, below month navigation
- Background: rgba(239,68,68,0.08)
- Border: 1.5px rgba(239,68,68,0.2)
- Border radius: --radius-md
- Icon: + plus, --status-error-text-dark
- Label: "Add block"
- Font: 12px, 600 weight, --status-error-text-dark
- Admin only — hidden for Staff and Manager roles

### Block Item
Each block in the list:

**Top row:**
- Left: block name (13px, 600 weight, text-primary) +
  date/time string below (11px, text-tertiary)
  Format: "Sat May 10 · 4:00 PM – 6:00 PM" for timed
  OR "Sun May 17 · All day" for all-day
  OR "Mon May 18 – Fri May 22" for multi-day
- Right: scope badge

**Scope badge:**
- Specific lanes: bg-secondary bg, border-secondary border
  Text: "Lanes 5–8" or "Lane 6"
- All lanes (whole venue): rgba(239,68,68,0.15) bg, rgba(239,68,68,0.35) border
  Text: "All lanes" in --status-error-text-dark

**Bottom row (detail tags):**
- Flex row of small tags
- Tag: bg-primary bg, 1px border-secondary, --radius-full, 10px, text-tertiary
- Lanes tag (blue tint): shows specific lane numbers
  "Lanes 5, 6, 7, 8"
- Recurrence tag: "Repeats weekly" / "One time" / "5 days"

**Past blocks:**
- Full item at 45% opacity
- Recurrence tag shows "completed"
- Not tappable for editing

**Tapping a block item (Admin only):**
- Opens block edit sheet
- Same sheet as block creation, pre-populated with existing values

---

## Block Creation Sheet

Triggered by "＋ Add block" button or tapping an empty slot in day detail.
Bottom sheet on mobile, right panel (400px) on desktop.

### Sheet Anatomy
```
Handle bar
Sheet title: "Add block"
Form fields
Confirm button
```

### Scope Toggle (what to block)
- Pill toggle: "Whole venue" | "Specific lanes"
- Active: red tint — rgba(239,68,68,0.12) bg, rgba(239,68,68,0.3) border, red text
  (Red communicates restriction — this is intentionally different from amber)
- Inactive: bg-secondary, text-tertiary
- Default: "Specific lanes"

### Lane Selection (shown when "Specific lanes" selected)
- Label: "Lanes" (10px uppercase, text-tertiary)
- Row of numbered lane chips (one per lane in venue)
- Chip default: bg-secondary, border-secondary, text-tertiary
- Chip selected: bg-brand-solid / text-brand-secondary bg, white text, amber border
- Size: square-ish pill, 32px height, min-width 32px
- Multiple selection allowed
- Hidden entirely when "Whole venue" is selected

### Date Range Fields
- Start date + End date (same day for single-day blocks)
- Each: date picker input, bg-secondary bg, --radius-md
- For single-day blocks: one date field labeled "Date"
- For multi-day: two fields, "Start date" + "End date"

### Time Range Fields (optional — all-day toggle)
- "All day" toggle (on by default)
- When off: start time + end time fields appear
  Same styling as date fields
  Time format: 12-hour with AM/PM

### Block Name Field
- Label: "Block name" (10px uppercase)
- Input: bg-secondary, --radius-md
- Placeholder: "e.g. League night setup, Deep clean"
- Required

### Recurrence Toggle
- "Repeats" toggle (off by default)
- When on: frequency selector appears
  Options: "Daily" | "Weekly" | "Monthly"
  Weekly default
- Creates recurring LaneBlock records in DB

### Confirm Button
- Full width
- Background: rgba(239,68,68,0.1)
- Border: 1.5px rgba(239,68,68,0.25)
- Text: --status-error-text-dark, 14px, 600 weight
- Label: "Add block"
- Disabled until name + lanes/scope + date are filled
- On confirm: sheet dismisses, calendar updates immediately
  Block dot appears on affected days
  Day detail updates if that day is selected
  Toast: "Block added · [name]" — bg-primary bg, 3s auto-dismiss

### Block Edit Sheet (existing block)
- Same as creation sheet, pre-populated
- Confirm button label: "Save changes"
- Delete option: text button below confirm
  "Delete block" in --status-error-text-dark
  Tap → confirmation: "Delete this block?" · "Delete" + "Keep"
  On delete: sheet dismisses, calendar/list updates
  Toast: "Block removed · [name]"

---

## Desktop Schedule Behavior

- Calendar chrome follows Untitled month frame 7720:19525 (full-width card, not a 480px column)
- Reservation listing stacks **below** the month grid (same as mobile frame 7720:19824)
- Reservation details and block creation: Untitled right slideout (~400px), not a bottom sheet
- List view (`?view=list`): rail destination — same as mobile with more visible rows

---

## What Cursor Must Not Do (Schedule Tab)

- Put the view toggle (calendar/list icons) inside the staff header
  It belongs inline with the page title in the content area
- Use the same amber active state for the scope toggle as other toggles
  Scope toggle uses red active state — communicates restriction
- Allow Staff or Manager roles to see the "Add block" button
  Admin only — hide it entirely, don't disable it
- Show density bars as a count number — always a colored bar
- Navigate to a new page to create or edit a block — always a sheet
- Remove past blocks from the list — show them at 45% opacity
- Make density bar fill instant — always animate width 0.3s on load
