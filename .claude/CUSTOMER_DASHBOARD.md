# Royal Z Lanes — Customer Dashboard Interactions
# .claude/CUSTOMER_DASHBOARD.md
#
# Implementation status: PARTIAL
# `/dashboard` exists (MVP list + featured card). Guest path: `/find-my-booking`.
# Cancel/reschedule sheets, preferences, and full wireframe UX remain.
#
# Dependencies (schema): Migration 1 + 7 COMPLETE — behavior/UI in progress.
#
# Domain summary: BOOKING_DOMAIN.md Part 2 §Customer Dashboard
# Guest fallback (/find-my-booking) remains after dashboard is built.

---

## Routes

/dashboard                    — main dashboard (auth required)
/find-my-booking              — guest self-serve (always available)
/find-my-booking/[code]       — direct booking lookup (from email links)
/book/success                 — confirmation + account creation prompt

---

## Visual Language

Customer dashboard uses the CUSTOMER token namespace.
NOT the staff/admin dark theme.

data-theme="light" on the dashboard layout.

Key tokens:
  --surface-ground    page background
  --surface-card      cards
  --surface-dark      featured booking card + header + toasts
  --color-action      amber CTAs
  --color-text-primary
  --status-ok-*       confirmed/success states
  --status-error-*    cancelled/cancel actions

---

## Header

Background: --surface-dark (deep purple)
Left: venue name (--font-display, 16px, --color-text-inverted)
      address below (11px, --color-action-dark, tappable → Google Maps)
Right: profile icon button (avatar initials circle, 32px)
       Tap → preferences sheet

---

## Dashboard States

### State A — Upcoming bookings exist

Greeting:
  "Hey [First name] 👋"  (--font-display, 26px, --color-text-primary)
  "You have X upcoming booking(s)"  (13px, --color-text-secondary)

Featured card (next upcoming):
  Background: --surface-dark
  Border radius: --radius-xl
  Padding: 20px
  Date: --font-display, 22px, --color-text-inverted
  Time range: 13px, --color-action-dark
  Detail rows: bowlers, package, lane, confirmation code
  Check-in window badge (when within window):
    Background: --color-action-tint
    Text: "Check in now →" in --color-action-text
    Visible when: current time is within checkInWindowMinutes of startTime
  Self-serve window badge (when NOT in check-in window):
    "Free cancellation until [date]"
    Reads from booking.cancellationWindowHoursSnapshot (NOT current tenant setting)
  Action buttons: Reschedule · Cancel

Secondary upcoming cards (2nd booking onward):
  Background: --surface-card
  Border: 1.5px --color-border
  More compact than featured card
  Same action buttons, smaller

### State B — No upcoming bookings
  Empty state: bowling icon + "No upcoming bookings"
  CTA: "Book a lane" → /book

### State C — Post-cancel
  Featured card removed
  Toast: dark bg, red X, 4s auto-dismiss
  "Booking cancelled · Refund on its way"

### State D — Post-reschedule
  Featured card shows new date/time
  Green tint treatment on card
  "Rescheduled" badge
  Toast: dark bg, green check, 4s auto-dismiss

---

## Self-Serve Window Logic

CRITICAL: reads from booking snapshot, NOT current tenant settings.

```typescript
// CORRECT:
const canCancel = booking.cancellationWindowHoursSnapshot != null
  && isWithinHours(booking.startTime, booking.cancellationWindowHoursSnapshot)

// WRONG:
const canCancel = isWithinHours(booking.startTime, tenant.cancellationWindowHours)
```

When outside window:
  Cancel/Reschedule buttons: 35% opacity, cursor not-allowed
  Policy note: "Need to make changes? Call us at [phone]"
  Phone: tappable tel: link from getTenant()

---

## Cancel Flow (bottom sheet — stays on /dashboard)

Trigger: tap "Cancel" on any booking card.
Never navigate away from /dashboard.
Dashboard dims to 18% opacity behind open sheet.

Sheet contains:
  What's being cancelled (summary card)
  Cancellation policy note (reads from booking snapshot)
    Within window: "Free cancellation · Full refund to [card ····last4]"
    Outside window: "Cancellation fee may apply"
  "Yes, cancel" button (red tint)
  "Keep my booking" button (ghost)

On confirm:
  Booking → CANCELLED
  If within window + has Stripe payment: refund triggered
  Sheet dismisses
  Toast fires (dark bg, red X, 4s)

---

## Reschedule Flow (bottom sheet — stays on /dashboard)

Trigger: tap "Reschedule" on any booking card.
Never navigate away from /dashboard.

Sheet contains:
  Current booking strip (always visible — reference point)
  Mini calendar (same rules as /book Step 1)
    Current booking date: amber tint (not amber fill — not selected)
    Selected new date: --color-action bg, white text
  Time slots (appear after new date selected)
  Policy note (reads from booking.rescheduleWindowHoursSnapshot)
  CTA: "Confirm — [New date] at [New time]"
    Disabled until new date AND time selected
    Label includes selected values: "Confirm — Wed May 13 at 1:00 PM"
  Keep button: "Keep [Original date] at [Original time]"

On confirm:
  PATCH booking with new startTime/endTime
  New hold acquired for new time
  Old hold released
  Sheet dismisses
  Toast: "Booking rescheduled · Confirmation sent"
  Featured card updates to new date/time

---

## Preferences Sheet

Trigger: tap profile avatar in header.
Bottom sheet on all screen sizes.

Header: --surface-dark bg, "Preferences" in --font-display

Toggles:
  Email reminders — default ON
  SMS reminders — default ON  (requires smsReminderConsent = true)
  Email marketing — default OFF
  SMS marketing — default OFF

Venue note: "These preferences apply to [venue name] only."

Sign out section (below toggles):
  "Sign out" in red tint
  Tap → confirmation → redirect to /

---

## Past Bookings Section

Below upcoming section, "Past bookings" label.
Each row: date + package + lane count + amount + status badge
Read-only in v1. No actions.

---

## Account Creation — ClaimToken Flow

Triggered from /book/success "Create account" prompt.

1. Email pre-filled from booking.customerEmail
2. Customer sets password (one field, no confirm in v1)
3. POST /api/auth/claim with { token, password }
4. Server validates ClaimToken: exists, not expired, not claimed
5. User record created with tenantId scope
6. booking.userId backfilled
7. ClaimToken.claimedAt set (invalidated — single use)
8. Customer redirected to /dashboard
9. Their booking appears as upcoming

ClaimToken rules:
  Single-use: claimedAt set on first claim, rejects on repeat
  Expires 24h after booking CONFIRMED
  After expiry: account still creatable, booking not auto-linked
  Customer contacts venue to link manually

---

## Toasts (dashboard-specific)

All dashboard toasts use --surface-dark background for contrast
against the light page. This is intentional.

Success (rescheduled, preferences saved):
  Dark bg, green check icon (#6EE7B7 on dark)
  4s auto-dismiss

Cancel confirmation:
  Dark bg, red X icon (#F87171 on dark)
  4s auto-dismiss

All: top center, 16px from top of viewport.
Manual dismiss: tap anywhere on toast.

---

## Desktop Behavior

Dashboard: max-width 600px, centered
Cancel/reschedule sheets: centered modal (max-width 480px) on desktop
  NOT a bottom sheet on desktop
  Backdrop: --surface-dark 40% opacity, full viewport
Preferences sheet: right panel (320px) on desktop

---

## What Cursor Must Not Do

- Use staff tokens (--staff-bg, --staff-card etc.) — these don't exist
- Navigate away from /dashboard for cancel/reschedule flows
  Both are sheets that stay on the dashboard
- Read cancellationWindowHours from tenant for eligibility
  Always read from booking.cancellationWindowHoursSnapshot
- Pre-check marketing consent toggles — always default OFF
- Show cancel/reschedule buttons disabled without 35% opacity treatment
- Hardcode venue phone — use getTenant()
- Make ClaimToken reusable — single use, claimedAt invalidates it
- Auto-dismiss toasts in less than 4 seconds on the dashboard
  Booking actions are significant — give customers time to read
