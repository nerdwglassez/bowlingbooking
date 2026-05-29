# Implementation status:
# Target design — describes the intended UX when fully built.
# Current implementation: AppShell + NavRail (sidebar md+, bottom tab < md).
# Staff: /staff (cockpit), /staff/schedule, /staff/walkin
# Admin: /admin (settings root and sub-pages)
# Booking detail: stub at /staff/bookings/[id] — needs full build
# Read .claude/STAFF_INTERACTIONS.md for architecture context first.
#

# Staff Interactions — Section 2: Cockpit Lanes Sub-view & Walk-in FAB
# Source: staff-app-v2.html, staff-app-cockpit.html, walkin-booking-flow.html
# Status: COMPLETE — ready to merge into STAFF_INTERACTIONS.md

---

## Cockpit Tab — Lanes Sub-view

### Entering the Sub-view
- Tap "Lanes" in the cockpit toggle
- Content area replaces Overview content in place — no navigation, no sheet
- Toggle remembers last selection (localStorage key: 'cockpit_subview')
- Sub-view toggle remains visible at top of content area

### Page Structure (top to bottom)
```
Sub-view toggle: Overview | Lanes
Time window selector
Legend row
Timeline (scrollable horizontally per row)
Tab bar (persistent)
```

---

## Time Window Selector

- Row below the toggle: "Time window" label (left) + chip strip (right)
- Chips: "2 hr" | "4 hr" | "6 hr" | "All day"
- Active chip: --staff-card-raised bg, --staff-text-primary, 
  border 1px --staff-border-strong
- Inactive chip: --staff-card bg, --staff-text-muted, 
  border 1px --staff-border
- Font: 10px, 600 weight
- Padding: 3px 8px, --radius-full
- Changing the time window rescales the timeline columns
- Selection persists within session

---

## Legend Row

- Horizontal flex row, below time window selector
- 16px horizontal padding
- 4 items: Available · Occupied · Upcoming · Blocked
- Each item: 7×7px dot (2px border radius) + label
- Dot colors match lane state token backgrounds and borders
- Label: 9px, --staff-text-muted
- Gap between items: 10px

---

## Lane Timeline

### Structure
Each lane = one horizontal row:
```
[Lane label] [Timeline track — scrollable]
```

**Lane label (left, fixed 36px width):**
- Font: 11px, 600 weight, --staff-text-secondary
- Text align: right, 6px right padding
- Hover/active: --staff-action color

**Timeline track (flex: 1):**
- Height: 22px
- Background: --staff-card (empty/available lane)
- Border: 1px --staff-border
- Border radius: 4px
- Overflow: hidden
- Horizontally scrollable as a unit (all rows scroll together)
- Blocked lanes: --lane-blocked-bg fill, --lane-blocked-border border
  Centered text: "Blocked · [reason]" in --lane-blocked-text, 9px uppercase

### Column Headers
Row above all lane rows:
- Left: 36px spacer (aligns with lane labels)
- Right: hour labels at equal intervals matching time window
- Font: 8px, 600 weight, --staff-text-muted, centered per column

### Now Line
- 1.5px vertical amber line (--staff-action) at current time position
- Renders on every lane row at the same horizontal position
- Top indicator: 7×7px amber circle (--staff-action), positioned at top of now line
- z-index above booking blocks
- Updates position in real time (every 60 seconds)

### Booking Blocks
Positioned absolutely within the timeline track:
- Top/bottom: 2px inset (leaves 2px above and below)
- Border radius: 3px
- Customer name (truncated): 9px, 600 weight, 5px horizontal padding
- Overflow: hidden (long names truncate)

**Block states:**
- Occupied (active now):
  Background: rgba(248,113,113,0.25)
  Border: 1px --status-error-text-dark
  Text: --lane-occupied-text
- Upcoming (future):
  Background: rgba(245,158,11,0.20)
  Border: 1px --palette-amber-500
  Text: --lane-upcoming-text
- Completed (past):
  Background: rgba(87,83,78,0.30)
  Border: 1px --staff-border
  Text: --staff-text-muted

### Tap Behavior
- Tapping a booking block → booking detail sheet slides up
  (same sheet as Overview — identical behavior)
- Tapping an empty track area → no action on mobile
- Tapping an empty track area on desktop → create block / walk-in prompt
- Tapping the lane label number → lane detail inline expand (see below)

### Lane Detail Inline (tap lane label)
- Below that lane row a detail strip expands
- Height 0 → auto, opacity 0 → 1, --duration-base
- Shows: current booking name + end time, OR "Open — no bookings"
- Shows: next booking name + start time if exists
- Two action buttons: "Walk-in" (creates walk-in on that lane) 
  and "Block" (opens block creation sheet)
- Collapse: tap lane label again or tap elsewhere

### Desktop Timeline Behavior
- Timeline takes full content width (no sidebar interference)
- All lanes visible simultaneously without vertical scroll
- Time window defaults to "4 hr" on desktop
- Horizontal scroll is disabled on desktop (full window fits)
- Tapping empty track shows "Walk-in on Lane X" tooltip immediately

---

## Lane Grid (Cockpit v1 — Overview lane section)

The v1 cockpit shows lanes as a grid at the top of the Overview sub-view,
above the upcoming list. This is different from the timeline.

### Grid Structure
- 3-column grid, 8px gap
- 16px horizontal padding
- Displayed above upcoming list in the Overview sub-view
- NOT the same as the Lanes sub-view timeline

### Lane Card
- Border radius: --radius-md
- Padding: 10px 10px 8px
- Border: 1px, color from lane state
- Cursor: pointer
- Transition: all 0.2s

### Lane Card Contents
- Lane number: --font-display, 18px, --staff-text-primary, line-height 1
- Status text: 9px, 600 weight, uppercase, letter-spacing 0.05em, 3px top margin
- Time detail: 10px, 600 weight, 2px top margin (occupied shows "until 3:00",
  upcoming shows "2:30 PM")
- Detail text: 10px, --staff-text-muted, 4px top margin 
  (blocked lanes show reason e.g. "Maintenance")

### Lane Card States and Colors
```
Available:
  bg: --lane-available-bg    (#0A1A0F)
  border: --lane-available-border  (green-500)
  status text: --lane-available-text  (green-400)

Occupied:
  bg: --lane-occupied-bg     (#1A0A0A)
  border: --lane-occupied-border   (red-400)
  status text: --lane-occupied-text   (#FCA5A5)
  time: --lane-occupied-text

Upcoming:
  bg: --lane-upcoming-bg     (#1A1400)
  border: --lane-upcoming-border   (amber-500)
  status text: --lane-upcoming-text   (amber-400)
  time: --lane-upcoming-text

Blocked:
  bg: --lane-blocked-bg      (#0F0F12)
  border: --lane-blocked-border    (stone-600)
  status text: --lane-blocked-text    (stone-500)
```

### Selected Lane Card (when tapping opens booking detail)
- box-shadow: 0 0 0 2px --palette-amber-500
- transform: scale(1.04)
- Transition: transform 0.15s --ease-spring
- Returns to normal scale when sheet dismisses

### Tap Behavior
- Tap any lane card → booking detail sheet slides up
- Available lanes: sheet shows "No active booking · [time] open"
  with single action: "Create walk-in"
- Occupied/upcoming/blocked lanes: standard booking detail sheet

---

## Walk-in FAB

### Position and Appearance
- Position: absolute, bottom 70px (above tab bar), right 16px
- Size: 44×44px circle
- Background: --staff-action (amber)
- Icon: + (plus), white, 20px, font-weight 300
- Border radius: --radius-full
- Shadow: 0 4px 16px rgba(245,158,11,0.4)
- Border: none
- z-index: above all cockpit content, below sheets

### Visibility Rules
- Shown on Cockpit tab (both Overview and Lanes sub-views)
- Hidden on all other tabs (Schedule, Reports, Team, Settings)
- Hidden when walk-in sheet is open
- Hidden when booking detail sheet is open
- Disabled (opacity 0.4) if walk-in bookings are turned off in settings

### Tap Behavior
- Tap FAB → walk-in sheet slides up from bottom
- Cockpit content dims to 18% opacity (not a backdrop overlay —
  the content itself is dimmed via opacity on the content wrapper)
- FAB hides as sheet opens

---

## Walk-in Booking Flow

### Sheet Trigger and Context
- Opens from FAB tap or from "Create walk-in" in available lane sheet
- If triggered from a specific lane, that lane is pre-selected in Step 2
- Cockpit content stays visible at 18% opacity behind the sheet
- Tab bar remains visible — tapping another tab dismisses the sheet

### Sheet Structure
```
Handle bar (32×3px, --staff-border-strong)
Sheet header: title + 3-dot step indicator
Sheet content (scrollable)
Next/Back button (sticky at sheet bottom)
```

### Step Indicator in Sheet Header
- 3 dots: step 1, step 2, step 3
- Active step: wider pill (20px wide), --staff-action
- Completed step: 8px circle, --staff-action at 60% opacity
- Upcoming step: 8px circle, --staff-border
- Title changes per step: "New booking" → "Package & lane" → "Confirm booking"

### Step 1 — Guest Details

**Source selector:**
- 3 pills: "Walk-in" | "Phone" | "Advance"
- Default: Walk-in (pre-selected)
- Selected: --staff-action bg, white text
- Unselected: --staff-card-raised bg, --staff-text-muted text
- Border: 1.5px --staff-border-strong (unselected), transparent (selected)
- Source affects booking record (WALK_IN / PHONE / ADVANCE)

**Guest name field:**
- Label: "Guest name" (10px uppercase, --staff-text-muted)
- Input: --staff-card-raised bg, 1.5px --staff-border-strong border, --radius-md
- Placeholder: "First name or group name"
- No last name required — walk-ins are informal

**Email field:**
- Label: "Email" with "— optional" suffix (lighter, non-uppercase)
- Note below field: "Add email to send a receipt or confirmation"
- NOT required — walk-ins often won't have email handy

**Bowler count stepper:**
- Inline stepper: [−] [count] [+]
- Minus/plus: 32×32px, --radius-sm, --staff-card-raised bg
- Count: --font-display, 24px, --staff-text-primary, min-width 36px, centered
- Below stepper: "X lanes required" in 11px --staff-text-muted
  Updates live as count changes: "1 lane" at 1–6, "2 lanes" at 7–12, etc.
- Minimum: 1 bowler
- Maximum: determined by available lane count

**Time fields (for Phone and Advance sources):**
- Walk-in defaults to "Now" — no time field shown
- Phone/Advance: date picker + time picker appear
  Same pill style as customer booking flow

### Step 2 — Package & Lane

**Package selector:**
- Dropdown (not radio cards — this is a staff tool, speed matters)
- Default: "No package" (first option, pre-selected)
- Options from packages table: name + pricing summary
  Format: "Cosmic Bowl — $12.00/hr per person"
  OR: "Birthday Party — $185 flat"
- Background: --staff-card-raised, border 1.5px --staff-border-strong
- Selecting a package does NOT auto-populate bowler count
  (staff already entered bowler count in Step 1)

**Lane assignment:**
- Auto-assign row (default):
  Background: rgba(16,185,129,0.06), border rgba(16,185,129,0.25)
  Label: "Auto-assigned" in --status-available-text (green)
  Sub: "Next available lane" in --staff-text-muted
  Right: Lane number in --font-display, 16px
  "Override" button: text button, --staff-action color

- Override state (tapped Override):
  Auto-assign row collapses
  Mini lane grid appears below
  Instructional text: "Tap to select a different lane"

**Mini lane grid (override mode):**
- Compact grid of numbered lane cells
- Same state colors as the main lane grid
- States: available / occupied / selected / current
  Current: blue tint (rgba(96,165,250,0.1)), blue border
  Selected: --color-action-tint, --staff-action border
  Occupied: --lane-occupied-bg, 50% opacity, not tappable
- Legend row below grid: Available · Current · Selected · Occupied
- Confirmation note: "Lane X available at [time]" in --status-available-text
- "Apply — Lane X" button: full width, --staff-action bg

### Step 3 — Confirm Booking

**Summary card:**
- --staff-card bg, --radius-md, 1px --staff-border border
- Rows: Guest · Bowlers · Package · Lane · Source · Started
- Label: 10px uppercase, --staff-text-muted
- Value: 13px, 500 weight, --staff-text-primary
- "Started" value: "Now · 2:14 PM" in --staff-action color

**Payment method chips:**
- 3 pills: "Cash" | "Card terminal" | "Tab / invoice"
- Default: Cash
- Selected: --staff-action bg, white text
- Unselected: --staff-card-raised, --staff-text-muted
- Note below: "Payment is handled at the desk — no online charge."
- Note: 10px, --staff-text-muted

**CTA button:**
- Full width, --staff-action bg
- Label: "Create & check in"
- This is ONE action that creates the booking AND marks it CHECKED_IN
- No Stripe, no hold, no confirmation email (unless email was provided)
- On success: sheet dismisses, cockpit updates immediately
  Toast: "Walk-in created · Lane X · [Guest name]"
  Lane card updates to occupied state

### Back Navigation Between Steps
- Back chevron in sheet header: "‹ [previous step title]"
- State is preserved on back navigation
- Cannot go back from Step 3 after "Create & check in" is tapped

### Sheet Dismiss (any step)
- Swipe down on handle bar
- Tap dimmed cockpit content
- Shows discard confirmation: "Discard this booking?"
  "Keep editing" + "Discard" buttons
  Only shown if any field has been filled in Step 1
  If Step 1 is empty, dismisses immediately without confirmation

### Desktop Walk-in Behavior
- Same 3-step flow but renders as a right-side panel (400px)
  instead of a bottom sheet
- Panel slides in from right: translateX(100%)→0
- Cockpit content does NOT dim on desktop — panel overlays it
- All other behavior identical

---

## What Cursor Must Not Do (Lanes Sub-view & Walk-in)

- Make the lanes sub-view a separate page or route
- Use different toggle styling than the Overview/Lanes pill toggle
- Use emoji or image icons for lane state — use color and text only
- Hardcode lane state colors — always use --lane-*-bg/border/text tokens
- Show the walk-in FAB on any tab other than Cockpit
- Navigate to a new page for walk-in booking — always a sheet
- Make email required in the walk-in flow
- Show Stripe payment form in the walk-in flow — payment is desk only
- Bulk-assign lanes without staff selecting — auto-assign + override is correct
- Require package selection in walk-in — "No package" is valid
- Create the booking in PENDING state — walk-ins are immediately CHECKED_IN
