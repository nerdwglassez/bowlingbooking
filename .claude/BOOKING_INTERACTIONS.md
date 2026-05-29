# Royal Z Lanes — Booking Flow Interactions
# .claude/BOOKING_INTERACTIONS.md
#
# Interaction behavior, animation, and UX rules for the customer
# booking flow. Read alongside:
#   BOOKING_DOMAIN.md — business rules, server actions, schema
#   DESIGN_SYSTEM.md — tokens and component layers
# Paste into Cursor when building any customer booking step.

---

## Flow Overview

5 pages, linear progression. No skipping.

```
/book           Step 1 — Bowler count + Date/Time
/book/package   Step 2 — Package selection
/book/details   Step 3 — Shoe sizing per bowler  [NOT YET BUILT]
/book/confirm   Step 4 — Review + Payment
/book/success   Step 5 — Confirmation
```

State lives in BookingContext (src/context/BookingContext.tsx).
Changing an upstream field cascades and clears downstream selections.

---

## Step 1 — Bowler Count + Date/Time  (/book)

### Bowler count
- **Current:** default 1 bowler on first load (`DEFAULT_BOWLER_COUNT = 1`)
- **Wireframe target:** default 2 — update when Step 3 is built (see Part 2
  §Booking Step 3 in BOOKING_DOMAIN.md)
- Minimum: 1 bowler
- Maximum: 18 bowlers (online booking cap)
- Control: stepper — [−] count [+]
- Live feedback below stepper: "X lanes required"
  Uses formatLaneRequirementLine(bowlerCount) from lane-logic.ts
- At 18 bowlers: "+" button disabled
  Banner appears: "For groups larger than 18, call us at [phone]"
  Phone is tappable tel: link from getTenant()

### partyType [PLANNED REMOVAL]
partyType is currently collected at Step 1 and used to filter
packages at Step 2. Wireframe decision removes it from the customer
flow — package selection implies partyType.

Current state: partyType picker still renders in book/page.tsx
Planned state: remove picker, derive partyType from selected package
Do not remove until the inference logic is in place.

### Date selection
- Calendar loads current month by default
- Past dates: muted, not selectable
- Dates with no available slots: same muted treatment
- Tap a date → time slots for that date load below calendar
- Selected date: --color-action bg, white text
- Today: --color-border border only (not selected)
- Changing date: clears selected time slot (cascading invalidation)
- Month navigation: ‹ chevron · "May 2026" · › chevron

### Availability (server action)
`getAvailableTimeSlots(tenantId, date, laneCount)` — called when a date is selected.
See BOOKING_DOMAIN.md §Availability and booking operations.
Slots are returned as TimeSlot objects with startTime, endTime, id.
Expired holds are cleaned lazily before computing slots.
Never call per-day availability in a loop — one call per date tap.

### Time slot selection
- Slots render as pill options: "2:00 PM", "2:30 PM", etc.
- Selecting a slot: calls acquireBookingHold() immediately
  Hold timer starts in BookingContext (holdExpiresAt)
- Hold timer renders below selected slot:
  Color: amber (--color-action) — neutral urgency, not green
  NOT green — green would imply the booking is confirmed
  "Hold expires in X:XX" counting down
- Continue button: enabled only when date + slot both selected

---

## Step 2 — Package Selection  (/book/package)

### Package list
- One card per active package
- Cards are role-agnostic — PUBLIC packages only
  CODE_REQUIRED packages hidden (planned — unlocked at Step 4)
- Currently filtered by partyType from Step 1 (planned removal)
- No package required to continue — customer can proceed without one

### Package card
- Layout: package name + price + brief description + "Details" button
- Selecting: card gets --color-action border + amber check badge
- "Details" button: opens PackageDetailSheet (bottom sheet)
  Never navigates away from the page

### PackageDetailSheet
- Bottom sheet on all screen sizes
- Handle bar: 32×3px, --color-border-strong
- Full package info: name, description, inclusions, pricing
- "Add this package" button at bottom of sheet
- Dismiss: swipe down or tap outside

### Price footer
- Sticky at bottom of page
- Shows: package name (if selected) + shoe rental estimate + total
- Updates live as package is selected/deselected
- "Continue" button: always enabled (package optional)

---

## Step 3 — Shoe Sizing  (/book/details)  [NOT YET BUILT]

This step does not exist yet. The flow currently jumps from
/book/package directly to /book/confirm.

### When built, it should:

#### One row per bowler
- "Bowler 1", "Bowler 2", etc.
- Each row: shoe size dropdown + optional remove button
- Remove button hidden when only 1 bowler remains

#### Shoe size dropdown (per bowler)
First option: "Own shoes" — sets shoe cost for that bowler to $0
Remaining options:
  Youth sizes: grouped under "Youth"
  Adult Women: "Women's 5" through "Women's 12"
  Adult Men: "Men's 6" through "Men's 15"
  (Combined format acceptable: "Women's 5 / Men's 3.5")
Selecting a size: adds tenant.shoeRentalPrice to price for that bowler
Selecting "Own shoes": sets that bowler's shoe cost to $0

#### Own shoes warning
Trigger: any bowler selects "Own shoes"
Style: informational — --status-info-bg, --status-info-text
Icon: info circle
Message: "Shoes worn on the lanes must meet bowling shoe requirements
to prevent lane damage. If your shoes do not qualify, you will be
required to rent shoes at the center."
Shows once regardless of how many bowlers select "Own shoes"
Not dismissable (always visible as a reminder)
Not alarming — info color, not error color

#### Price footer
- Updates live per shoe selection
- Line items: one per bowler showing shoe cost or "Own shoes"
- Subtotal, tax, total

#### Continue button
- Disabled until all bowlers have a shoe selection
- Tooltip/note when disabled: "Select shoe size for each bowler"

#### BookingContext additions needed
- shoeSelections: Array<{ bowlerId: string; size: string; cost: number }>
- setShoeSelection(bowlerIndex, size, cost)
- addBowler() / removeBowler(index) — updating bowlerCount bidirectionally

---

## Step 4 — Review + Payment  (/book/confirm)

### Summary card
- Date + time + lane count
- Package name (or "No package selected")
- Bowlers + shoe selections summary  [when Step 3 is built]
- Price breakdown (itemized from calculatePrice())

### Customer info fields
- Name: text input, required
- Email: email input, required
- Phone: tel input, optional
- Marketing consent checkbox [PLANNED — Migration 2]
  "Send me promotions and news from [venue name]"
  Default: UNCHECKED
- SMS reminder consent checkbox [PLANNED — Migration 2]
  "Text me a reminder before my booking"
  Default: UNCHECKED

### Promo code field (current — PromoCode entity)
- Below customer info fields, above Stripe payment form
- Component: `PromoInput` on `/book/confirm`
- Placeholder: "Have a promo code?"
- On submit: `BookingContext.applyPromoCode()` → `validatePromoCode()`
- Valid code: discount shown in summary / price breakdown
- Invalid code: inline error below field — NOT a toast
- Server re-validates in `confirmBooking()` — see PROMO_CODES_DEPRECATED.md
- When Migration 4 completes: this field unlocks CODE_REQUIRED packages
  (may merge with the CODE_REQUIRED field below)

### CODE_REQUIRED package field [PLANNED — Migration 4]
- "Have a special code?" text link below customer info
- Expands a code entry field
- Valid CODE_REQUIRED code: replaces package selection
  If PAYMENT_OFFLINE: Stripe form hidden, banner shown
  "Payment will be arranged with the venue"
- Invalid code: inline error

### Stripe payment
- PaymentIntent created server-side via confirmBooking()
- Stripe.js renders payment form
- Never render Stripe form for PAYMENT_OFFLINE bookings

### Place booking button
- Label: "Place booking" (with payment)
- Label: "Confirm booking" (PAYMENT_OFFLINE — no charge now)
- Disabled until all required fields complete + payment ready

---

## Step 5 — Confirmation  (/book/success)

### Content (top to bottom)
- Success checkmark animation
- "Booking confirmed!" headline (--font-display)
- Confirmation code: large, prominent, bordered box
- QR code: centered, sized for mobile scanning
- Venue name + address (from getTenant())
- Date + time + lane count
- Package selected
- Bowler count + shoe rental summary
- Total paid (formatted from integer cents)
- Itemized price breakdown (collapsible)

### Account creation prompt
Below booking details:
"Want to cancel or reschedule without calling?
Create a free account — takes 30 seconds."
[Create account]  [Maybe later]
Subtle styling — not the primary CTA
Only shown when customer is not already signed in

### Venue contact
Always visible below account prompt:
"Need to make changes? Call us at [phone]"
Phone: tappable tel: link from getTenant()
Venue hours if available

### Confirmation email
Sent via Resend immediately after CONFIRMED status.
Contains: all above details + QR code image + cancel/reschedule links.
Cancel/reschedule links go to /find-my-booking for guest users.
"View or cancel booking" link: /find-my-booking/[code]?email=…
"Add to calendar" link: /api/bookings/[code]/ics?email=…

---

## Global Interaction Rules

### Hold timer
- Renders on Step 1 (after slot selected), Step 2, Step 3, Step 4
- Amber color (--color-action) — neutral urgency
- Format: "Hold expires in X:XX"
- At 0:00: session expired, redirect to /book with toast
  "Your session expired. Please select a new time."
- Hold timer does NOT appear on /book/success

### Navigation between steps
- Back navigation: always available via back chevron
- Back does NOT release the hold (intentional — customer can resume)
- Hold releases automatically on expiry via lazy cleanup
- Refreshing the page: session state preserved in BookingContext
  (React state only — not persisted to localStorage)

### Price footer
- Sticky bottom on Steps 1–4
- Not shown on Step 5
- Always shows current total
- "Processing..." label while PaymentIntent is being created

### Toasts
- Session expired: dark bg, red X icon, 5s
- Payment error: dark bg, red X icon, 5s, manual dismiss
- Invalid promo code: inline error under field, NOT a toast

### Loading states
- Time slot loading: skeleton pills matching slot width
- Package list loading: 3 skeleton cards
- Payment processing: spinner overlay on Stripe form, button disabled

### Animations
All transitions respect prefers-reduced-motion.
If motion is reduced: skip transitions, show final state immediately.

---

## What Cursor Must Not Do

- Navigate away from the page when PackageDetailSheet opens
- Use a modal for package detail — always a bottom sheet
- Hardcode prices in UI — use calculatePrice() for display; server re-runs at confirm
- Pass integer cents to Stripe incorrectly (Stripe PaymentIntent uses cents as-is)
- Show the hold timer in green — amber only
- Make the marketing consent checkbox default CHECKED
- Show an account creation prompt to already-signed-in users
- Render the Stripe form for PAYMENT_OFFLINE bookings
- Inline Math.ceil(bowlerCount / 6) — use getLaneCount()
- Hardcode venue phone or name — use getTenant()
