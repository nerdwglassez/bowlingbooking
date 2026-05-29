# Implementation status:
# Target design — describes the intended UX when fully built.
# Current implementation: AppShell + NavRail (sidebar md+, bottom tab < md).
# Staff: /staff (cockpit), /staff/schedule, /staff/walkin
# Admin: /admin (settings root and sub-pages)
# Booking detail: stub at /staff/bookings/[id] — needs full build
# Read .claude/STAFF_INTERACTIONS.md for architecture context first.
#

# Staff Interactions — Section 3: Booking Modification & Cancel Flow
# Source: booking-modification-flow.html, BOOKING_DOMAIN_refund_additions.md
# Status: COMPLETE — ready to merge into STAFF_INTERACTIONS.md

---

## Booking Modification Flow

### Navigation Model
This is a 5-state drill-in flow. All states live within sheets on top
of the cockpit. No new pages, no route changes.

```
State 1: Booking detail (read)
   ↓ tap "Modify"
State 2: Modify overview (all fields listed)
   ↓ tap a field row
State 3: Field editor (slides up over State 2)
   ↓ tap Apply
State 2: Modify overview (field shows pending change)
   ↓ tap "Save N change(s)"
State 5: Booking detail (updated, with green badge)
```

Back chevron label always names the parent state:
- Field editor header: "‹ Modify"
- Modify overview header: "‹ Detail"

This tells staff exactly where tapping back will take them.

---

## State 1 — Booking Detail (Read)

### Standard booking detail sheet (as documented in Section 1)
Additional elements visible in modify-capable bookings:

**Status badges (top of sheet content, below meta line):**
- "Confirmed" badge: green tint bg, --status-available-text
- "Updated" badge (shows after a modification): green tint bg, green text
  Fades in on return from save
  Both badges: 9px uppercase, --radius-full, small padding

**Modify button (in action row):**
- flex:2, amber tint bg rgba(245,158,11,0.1)
- Border: 1px rgba(245,158,11,0.2)
- Text: --status-warning-text-dark, 13px, 600 weight
- Label: "Modify booking"

**Contact row (detail rows):**
- Email: 📧 icon · value in --staff-action (tappable mailto: link)
- Phone: 📞 icon · value in --staff-action (tappable tel: link)
- Both are tappable — email opens mail client, phone opens dialer

---

## State 2 — Modify Overview

### Header
- Back chevron: "‹ Detail"
- Title: "Modify booking" (centered, --font-display, 16px)
- Cancel button: right side, text button, --staff-text-muted

### Identity Strip
- Customer name + confirmation code
- Background: --staff-card-raised, --radius-md, 1px --staff-border
- Name: 13px, 500 weight, --staff-text-primary
- Code: monospace, 10px, --staff-text-muted

### Field List
One row per modifiable field. All fields always shown.

**Field row (default state):**
- Background: --staff-card-raised
- Border: 1.5px --staff-border-strong
- Border radius: --radius-md
- Padding: 13px 14px
- Cursor: pointer
- Label: 10px uppercase, --staff-text-muted, 3px bottom margin
- Value: 13px, 500 weight, --staff-text-primary
- Chevron: › right side, --staff-action color, 14px, flex-shrink 0

**Fields shown (in this order):**
1. Date & time — "Sat May 10 · 3:00 PM"
2. Duration — "2 hours · ends 5:00 PM"
3. Bowlers — "6 bowlers · 1 lane"
4. Package — "Cosmic Bowl" OR "No package"
5. Lane — "Lane 4"
6. Notes — "" OR note text (shown last)

**Field row (changed state):**
- Border: 1.5px rgba(245,158,11,0.35)
- Background: rgba(245,158,11,0.04) — very subtle amber tint
- Label: unchanged
- New value: 13px, --staff-action color (amber)
- Original value: 10px, --staff-text-muted, text-decoration: line-through
  Shown below new value, format: "Lane 4" with strikethrough

### Instructional Text
- Below field list, above save buttons
- "Tap a field to change it"
- 11px, --staff-text-muted, centered
- Only shown when no changes have been applied yet

### Change Log
- Appears below field list when ≥1 change is applied
- Background: rgba(245,158,11,0.04), border rgba(245,158,11,0.15)
- Label: "Changes" (9px uppercase, --palette-amber-700)
- Each row: field name left, new value right, 11px
- Compact summary of all pending changes

### Save / Discard Buttons
- "Save N change(s)": full width, --staff-action bg, white text
  Disabled (opacity 0.35) until at least one change applied
  Label updates dynamically: "Save 1 change" → "Save 3 changes"
- "Discard all changes": full width, no bg, --staff-border border
  Text: --staff-text-muted, 13px
  Always shown even when save is disabled (allows escape)
  Tapping Discard: shows confirmation if changes exist
  Confirmation: "Discard X change(s)?" · "Keep editing" + "Discard"

---

## State 3 — Field Editor

### How It Appears
- Slides up from bottom of the sheet: translateY(100%)→0
- The Modify overview DIMS behind it: opacity drops to 18%
- The highlighted field row (the one that was tapped) is visible
  in the dimmed overview, slightly more prominent than others
- Editor has its own handle bar at top

### Header
- Back chevron: "‹ Modify" (no cancel button needed)
- Title: name of the field being edited (e.g., "Change lane")
- Right side: empty spacer (keeps title visually centered)

### Per-Field Editor Contents

**Date & Time editor:**
- Mini calendar (same visual rules as Schedule tab)
- Time slot pills below calendar
- Current date highlighted in blue tint (not amber — it's the "current" state)
- Unavailable dates: muted, not selectable
- Apply button: disabled until new date AND time selected

**Duration editor:**
- Stepper: [−] [value] [+]
- Increments: 30 minutes
- Min: 1 hour, Max: configurable per venue
- Inline note: "Ends at [calculated end time]" updates live
- Apply button: always active once duration shown

**Bowlers editor:**
- Stepper: same large centered style as walk-in flow
- Inline note: "X lanes required" updates live
- Warning if reducing bowlers below package minimum:
  amber note "Package serves X bowlers"
  Non-blocking

**Package editor:**
- Dropdown (not a card grid — staff tool, speed matters)
- Options: packages from tenant packages table
- First option: "No package"
- Apply button: active once selection made

**Lane editor:**
- Instructional note: "Current lane is in blue. Tap to select a different lane."
- Mini lane grid: same state colors as cockpit lane grid
  Current lane: blue tint bg rgba(96,165,250,0.1), blue border
  Selected lane: --color-action-tint bg, --staff-action border
  Occupied: --lane-occupied-bg, 50% opacity, cursor not-allowed
  Available: --lane-available-bg, --lane-available-border
- Legend row: Available · Current · Selected · Occupied
- Availability note: "Lane X available at [time]" in green when valid selection
  Background: rgba(16,185,129,0.06), green border, green checkmark icon
- Apply button: label includes selected lane — "Apply — Lane 5"
  Disabled until a different lane is selected

**Notes editor:**
- Textarea: --staff-card-raised bg, --radius-md, --staff-border-strong
- Placeholder: "Add a note about this booking…"
- 4 rows tall
- Apply button: always active

### Apply Button Behavior
- Full width, --staff-action bg, white text
- Label includes the selected value where applicable:
  "Apply — Lane 5", "Apply — 3:00 PM", "Apply — Cosmic Bowl"
- On tap: field editor slides down, Modify overview returns to full opacity
  Changed field row updates to show new value in amber + original strikethrough
  Save button activates (count increments)

### Back Without Applying
- Tap "‹ Modify" back button
- Editor slides down, no change recorded
- Modify overview returns to full opacity
- Field row returns to unchanged state

---

## State 4 → Save

### Save Confirmation
- No confirmation modal — save fires immediately on button tap
- Single PATCH request to /api/staff/bookings/[id]
- All pending changes sent atomically in one request

### Loading State During Save
- Save button shows spinner in place of label
- Field rows become non-interactive (pointer-events none)
- Duration: typically < 1 second

### After Save (State 5 — Updated Detail)
- Sheet content transitions back to booking detail (read state)
- Transition: sheet content fades/slides — same sheet, swapped content
- New values shown in detail rows
- Updated rows: green tint icon container, green-tinted value
  "← was [original value]" note in --staff-text-muted below new value
  This note fades out after ~3 seconds
- "Updated" green badge appears next to "Confirmed" in status row
- Toast: "Booking updated · Confirmation sent to [email]"
  --staff-card bg, green checkmark icon
  Auto-dismiss 3s, top center

---

## Staff Cancel Flow

Triggered by tapping "Cancel" in the booking detail sheet.

### Cancel Sheet
- Slides up from bottom — same mechanism as field editor
- Booking detail DIMS behind it: 18% opacity
- Header: "‹ Detail" back · "Cancel booking" title · no right button

### What's Being Cancelled (summary card)
- Name: 13px, 600 weight, --staff-text-primary
- Details: "Sat May 10 · 3:00 PM · 6 bowlers · Lane 4" — 11px, --staff-text-muted
- Background: rgba(239,68,68,0.05), border rgba(239,68,68,0.15), --radius-md

### Reason Selection (required)
- Section label: "Reason" (10px uppercase, --staff-text-muted)
- 3 radio-style options:
  1. Customer request
  2. No show
  3. Venue issue
- Each option: flex row, 14px circle radio + label
  Selected: circle filled --status-error-text-dark, border --status-error-text-dark
  Unselected: empty circle, --staff-border-strong border, 60% opacity
- Cannot proceed without selecting a reason

### Refund Toggle (conditional)
Shown ONLY when ALL of:
- Booking has a succeeded Stripe payment
- Payment has not already been refunded
- Current user role is MANAGER or ADMIN

Hidden entirely (not shown, not disabled) when:
- Booking source is WALK_IN or PHONE (no Stripe payment)
- Payment record not found
- Already refunded
- User is STAFF role

**Toggle appearance:**
- Row: --staff-card-raised bg, 1px --staff-border, --radius-md
- Left: "Issue refund" (13px, 500 weight) + "Return $X.XX to [card last 4]" (10px, --staff-text-muted)
- Right: iOS-style toggle (38×21px), --staff-action when on
- Note below toggle: "Refund will be processed immediately." (10px, --staff-text-muted)
- Default: OFF (staff must explicitly choose to refund)

### Confirm Cancel Button
- Full width
- Background: rgba(248,113,113,0.1)
- Border: 1.5px rgba(248,113,113,0.3)
- Text: --status-error-text-dark, 14px, 600 weight
- Label: "Confirm cancellation"
- Disabled until reason is selected

### After Cancel
- Both sheets dismiss (cancel sheet + booking detail)
- Cockpit content returns to full opacity
- Lane card updates to available state immediately
- Stat cards update: active/upcoming decrements

**Toast:**
- Standard cancel (no refund): "Booking cancelled · [name]"
  --staff-card bg, red X icon, 3s auto-dismiss

- Cancel + refund: "Booking cancelled · Refund issued to [card]"
  --staff-card bg, red X icon, slightly longer (4s auto-dismiss)

### Post-Cancel Booking Detail (if reopened)
- Status badges: "Cancelled" (red tint) + "Refunded" (green tint, if applicable)
- Payment row: amount with strikethrough, "Refund issued" note below in green
- Audit trail section appears at bottom of sheet:
  Background: --staff-card-raised, --radius-md
  Shows: Reason · Cancelled by [name · role] · Timestamp
  Font: 11px, --staff-text-muted for labels, --staff-text-secondary for values

---

## Desktop Modification Behavior

- Modification flow renders as a right-side panel (400px) instead of sheets
- Field editors slide up within the panel — not full-screen
- Dimming applies to the panel content only, not the cockpit behind it
- All other states and transitions identical

---

## What Cursor Must Not Do (Modification Flow)

- Navigate to a new page or route for any modification state
- Use a full-screen overlay instead of dimming content to 18%
- Show a separate confirmation step before saving — save fires immediately
- Show the refund toggle for walk-in or phone bookings
- Show the refund toggle to Staff-role users
- Make "Save changes" button active before any change is applied
- Send separate API calls per changed field — one atomic PATCH only
- Remove the "← was [value]" note immediately — it fades after 3 seconds
- Show the change log before any change has been applied
- Close both sheets when back-navigating from field editor — only editor closes
