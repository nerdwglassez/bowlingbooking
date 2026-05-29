# Implementation status:
# Target design — describes the intended UX when fully built.
# Current implementation: AppShell + NavRail (sidebar md+, bottom tab < md).
# Staff: /staff (cockpit), /staff/schedule, /staff/walkin
# Admin: /admin (settings root and sub-pages)
# Booking detail: stub at /staff/bookings/[id] — needs full build
# Read .claude/STAFF_INTERACTIONS.md for architecture context first.
#

# Staff Interactions — Section 4: Schedule Tab
# Source: schedule-calendar-blocking.html
# Status: COMPLETE — ready to merge into STAFF_INTERACTIONS.md

---

## Schedule Tab Overview

### Access
All roles: Staff, Manager, Admin can view the Schedule tab.
Only Admin can create, edit, or delete lane blocks.
Staff and Manager see blocks as read-only.

### Page Structure
```
Staff header (persistent)
Page title "Schedule" + view toggle (top right)
Month navigation (‹ May 2026 ›)
Calendar grid
Divider
Day detail panel (below calendar, updates on day tap)
Tab bar (persistent)
```

### View Toggle
- Top right of page, inline with "Schedule" title
- Two icon buttons: calendar grid icon | list icon
- Active: rgba(245,158,11,0.12) bg, rgba(245,158,11,0.3) border, amber icon stroke
- Inactive: no bg, --staff-border-strong border, --staff-text-muted icon, 45% opacity
- Button size: 32×32px, --radius-md
- Toggle switches between Calendar view and Blocked Times List view
- NOT a sub-view toggle like cockpit — this is an icon button pair in the header row

---

## Calendar View (default)

### Month Navigation
- Centered row: ‹ chevron · "May 2026" · › chevron
- Month label: --font-display, 16px, --staff-text-primary
- Chevron buttons: 16px SVG, --staff-text-muted, tappable
- Changing month: calendar grid updates, day detail clears

### Day-of-week Header Row
- 7 columns: Su Mo Tu We Th Fr Sa
- Font: 10px, 600 weight, --staff-text-muted, centered
- Padding: 4px 0

### Calendar Grid
- 7-column grid, 3px gap
- Each cell: aspect-ratio 1:1, --radius-sm

**Day cell states:**

Normal (current month, no blocks):
- No background
- Hover: --staff-card bg
- Day number: 11px, 600 weight, --staff-text-secondary

Today:
- Background: rgba(245,158,11,0.08)
- Border: 1px rgba(245,158,11,0.25)
- Day number: --staff-action color

Selected:
- Background: --staff-action
- Day number: white, 11px, 600 weight

Other month (leading/trailing days):
- Full cell: 20% opacity
- Day number: --staff-text-muted

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
- Base: --staff-border color (empty)
- Fill: colored bar showing booking density as % of capacity

Fill colors by occupancy:
- Low (< 50% full): --palette-green-500
- Busy (50–89% full): --staff-action (amber)
- Full (≥ 90% full): --status-error-text-dark (red)
- Transition: width 0.3s (animates on load)

### Day Tap Behavior
- Tap any day → day detail panel updates below calendar
- Selected day gets --staff-action background
- Previous selection deselects
- Day detail slides up with content: translateY(8px)→0, opacity 0→1, --duration-base

---

## Day Detail Panel

Sits below the calendar, separated by a 1px --staff-border divider.
Always visible — shows current or today's detail by default.

### Day Detail Header
- Left: date ("Saturday, May 10" in --font-display, 16px, --staff-text-primary)
  Sub-line: "X bookings · X lanes in use" (10px, --staff-text-muted)
- Right: "＋ Add block" text button (Admin only)
  Font: 11px, 600 weight, --staff-action
  Plus icon + label
  Staff/Manager role: button hidden entirely

### Booking Slot List
Time-sorted list of all bookings for the selected day.

**Standard booking slot:**
- Background: --staff-card, --radius-md, 1px --staff-border
- Padding: 9px 11px
- Time: --font-display, 13px, --staff-text-primary, min-width 52px
- Customer name: 12px, 600 weight, --staff-text-primary
- Meta: 10px, --staff-text-muted — "X bowlers · [Package]"
- Status pip: 8px circle, right side

**Blocked slot (lane block):**
- Background: rgba(239,68,68,0.05)
- Border: rgba(239,68,68,0.2)
- Label: block name (e.g. "League night setup")
- Meta: "Lanes 5–8" or "All lanes"
- No customer name, no status pip
- Edit icon: right side, --staff-text-muted (Admin only)

**Tapping a booking slot:**
- Opens booking detail sheet (same sheet as cockpit)
- Calendar stays visible behind sheet

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
- Left: block name (13px, 600 weight, --staff-text-primary) +
  date/time string below (11px, --staff-text-muted)
  Format: "Sat May 10 · 4:00 PM – 6:00 PM" for timed
  OR "Sun May 17 · All day" for all-day
  OR "Mon May 18 – Fri May 22" for multi-day
- Right: scope badge

**Scope badge:**
- Specific lanes: --staff-card-raised bg, --staff-border border
  Text: "Lanes 5–8" or "Lane 6"
- All lanes (whole venue): rgba(239,68,68,0.15) bg, rgba(239,68,68,0.35) border
  Text: "All lanes" in --status-error-text-dark

**Bottom row (detail tags):**
- Flex row of small tags
- Tag: --staff-card bg, 1px --staff-border, --radius-full, 10px, --staff-text-muted
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
- Inactive: --staff-card-raised, --staff-text-muted
- Default: "Specific lanes"

### Lane Selection (shown when "Specific lanes" selected)
- Label: "Lanes" (10px uppercase, --staff-text-muted)
- Row of numbered lane chips (one per lane in venue)
- Chip default: --staff-card-raised, --staff-border, --staff-text-muted
- Chip selected: --staff-action bg, white text, amber border
- Size: square-ish pill, 32px height, min-width 32px
- Multiple selection allowed
- Hidden entirely when "Whole venue" is selected

### Date Range Fields
- Start date + End date (same day for single-day blocks)
- Each: date picker input, --staff-card-raised bg, --radius-md
- For single-day blocks: one date field labeled "Date"
- For multi-day: two fields, "Start date" + "End date"

### Time Range Fields (optional — all-day toggle)
- "All day" toggle (on by default)
- When off: start time + end time fields appear
  Same styling as date fields
  Time format: 12-hour with AM/PM

### Block Name Field
- Label: "Block name" (10px uppercase)
- Input: --staff-card-raised, --radius-md
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
  Toast: "Block added · [name]" — --staff-card bg, 3s auto-dismiss

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

- Calendar view: calendar grid remains compact (not stretched to full width)
  Max width: 480px centered in content area
- Day detail: renders to the right of the calendar as a fixed column
  Instead of below — side-by-side layout
- Block creation: right panel (400px), not bottom sheet
- List view: same as mobile with more visible rows

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
