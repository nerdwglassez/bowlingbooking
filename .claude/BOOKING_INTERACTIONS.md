# Royal Z Lanes — Booking Flow Interactions
# .claude/BOOKING_INTERACTIONS.md
#
# Interaction behavior, animation, and UX rules for the customer
# booking flow. Read alongside:
#   BOOKING_DOMAIN.md — business rules, server actions, schema
#   DESIGN_SYSTEM.md — tokens and component layers
# Paste into Cursor when building any customer booking step.
#
# Build status: Steps 1–5 built. BookingFlowShell on steps 1–4. CTA-only sticky footers on steps 2–4.
# Hold bar: neutral sunken, "Lanes held · MM:SS remaining". Price breakdown on confirm summary only.
# CODE_REQUIRED packages unlock at confirm (payment step). Details step includes remove-bowler.

---

## Flow Overview

5 pages, linear progression. No skipping.

```
/book           Step 1 — Bowler count + Date/Time
/book/package   Step 2 — Package selection
/book/details   Step 3 — Shoe sizing per bowler  [BUILT]
/book/confirm   Step 4 — Review + Payment
/book/success   Step 5 — Confirmation
```

State lives in BookingContext (src/context/BookingContext.tsx).
Changing an upstream field cascades and clears downstream selections.

---

## Step 1 — Bowler Count + Date/Time  (/book)

### Bowler count
- **Current:** default 1 bowler on first load (`DEFAULT_BOWLER_COUNT = 1`)
- **Wireframe target:** default 2 — optional polish when product confirms
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
- Hold timer renders below step strip (in shell):
  Neutral sunken bar — "Lanes held · MM:SS remaining"
  NOT green — green would imply the booking is confirmed
- Continue button: enabled only when date + slot both selected

---

## Step 2 — Package Selection  (/book/package)

### Package list
- **Open bowling is the default** — `packageId` null; no dedicated open-bowling card
- Hint copy under step title explains lane-only default; optional packages listed below
- One card per active package **except** the tenant lane-only default row (`isLaneOnlyDefaultPackage`)
- Package selection is **optional** — Continue enabled with or without a package when hold is valid
- Tap a selected package again to clear back to open bowling
- Package cards show neutral inclusion pills on load (`pkg-tag`); locked pills (`pkg-included-tag` + lock) only when that card is selected — per `booking-step2-refined.html` 2a / 2d

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

### Sticky footer (CTA only)
- Step 1: inline `<Button>` at bottom of content — no dark footer bar
- Steps 2–4: dark `BookingFlowFooter` sticky at bottom — **primary CTA only**
- Steps 2–4: optional **back button below CTA** (ghost, full width) — not in header
- No line items, subtotals, or totals in the footer — pricing lives in page content
  (package cards, `OrderSummaryCard` on confirm, success detail rows)
- Step 4 online: Pay button submits Stripe form via `formId`; optional policy note below CTA
- Step 4 offline: confirm CTA (no Stripe footer until payment path exists)
- "Processing…" / loading state on CTA while PaymentIntent is being created
- Back navigation lives in the footer only (not the header)

---

## Step 3 — Shoe Sizing  (/book/details)  [BUILT]

Implemented at `src/app/(customer)/book/details/page.tsx`. Flow:
`/book/package` → `/book/details` → `/book/confirm`.

### Behavior:

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

### Sticky footer (CTA only)
- Contextual CTA label (shoe selection progress, contact incomplete, etc.)
- Disabled until all bowlers have shoe selection + contact complete + valid hold
- Back button below CTA → Packages
- Contact form stays expanded while on this step — no auto-collapse to read-only card on email entry

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

### CODE_REQUIRED special access code
- **Not on package step** — code entry lives on `/book/confirm` only
- Collapsed **"Have a special code?"** link expands the field (part of payment flow)
- Auto-expanded when selected package requires a code
- Valid code: verifies for selected CODE_REQUIRED package, or replaces selection with the unlocked package
- Payment / Stripe form does not initialize until code is applied when required

### Stripe payment
- PaymentIntent created server-side via confirmBooking()
- Stripe.js renders payment form
- Never render Stripe form for PAYMENT_OFFLINE bookings

### Place booking button
- Label: "Pay $X.XX" or "Try again" (with payment) — amount in CTA label, not footer breakdown
- Label: "Confirm reservation" (PAYMENT_OFFLINE — no charge now)
- Disabled until all required fields complete + payment ready
- Itemized pricing: collapsible `OrderSummaryCard` in page body only

---

## Step 5 — Confirmation  (/book/success)

### Chrome
- Stone conf header (`BookingAppHeader`) — no step indicator, no hold bar
- Conf A: dismissible green celebration banner ("You're booked!" + email)
- Conf C (offline/pending): dark "Reservation held" banner instead of celebration

### Content (top to bottom)
- Confirmation / reservation code block (centered card)
- Detail card with icon rows: date & time, booking details, location, amount paid/due
- Add to calendar (single ICS download — not split Google/Apple buttons)
- Account creation prompt (signed-out only):
  Title: "Manage your booking"
  Body: "Create a free account to cancel or reschedule without calling us."
  Expanded form OR subdued "Create account →" link after dismiss
- Venue contact block: "Need to make changes?" + tappable phone
- Done button → home

### Account creation prompt
Below booking details (signed-out customers only):
"Manage your booking" / "Create a free account to cancel or reschedule without calling us."
[Create account]  [Maybe later]
Amber tint card on first visit; subdued inline prompt after "Maybe later"
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
- Renders on Steps 1–4 after a slot is held (via `BookingFlowShell`)
- Style: neutral sunken bar (`--surface-sunken`, `--color-border`)
- Copy: **"Lanes held · MM:SS remaining"**
- NOT green — green would imply the booking is confirmed
- NOT amber action-tint — neutral urgency (Figma may refine)
- At 0:00: session expired, redirect to /book with toast
  "Your session expired. Please select a new time."
- Hold timer does NOT appear on /book/success

### Booking flow chrome (`BookingFlowShell`)
All steps 1–4 share:
- **Stone chrome header** (`BookingAppHeader`): `--surface-booking-chrome`, venue name, maps address link. **Sign in** (`--color-booking-chrome-link`) only on step 4 (`/book/confirm`) via `showSignIn` + `CHECKOUT_SIGN_IN_PATH` (`/signin?from=/book/confirm`). Hidden on steps 1–3 and `/book/success`. Customers return to checkout; staff still land in `/staff` (`getPostSignInPath`).
- **Step strip**: 4 dots on `--surface-card`; active pill 22px; completed dots at 35% opacity
- **Hold bar** (above scroll content)
- **Header back** (steps 3–4 only): removed — use footer back below CTA via `BOOKING_BACK_BY_STEP`

Step 1 uses an inline primary CTA at the bottom of content (no dark footer bar).
Steps 2–4 use stone sticky `BookingFlowFooter` — **primary CTA + optional secondary back** below; no price lines.

### Navigation between steps
- Back navigation: steps 2–4 via footer back button below CTA; step 1 has no back
- Back does NOT release the hold (intentional — customer can resume)
- Hold releases automatically on expiry via lazy cleanup
- Refreshing the page: session state preserved in BookingContext
  (React state only — not persisted to localStorage)

### Price footer
- REMOVED — sticky footers are CTA-only on steps 2–4 (see "Sticky footer (CTA only)" above)
- Step 1: inline continue button
- Pricing display: in-content only (`OrderSummaryCard` on confirm; package cards on step 2)

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
- Show the hold timer in green — neutral sunken bar only
- Show price line items in sticky footers — CTA-only footers on steps 2–4
- Make the marketing consent checkbox default CHECKED
- Show an account creation prompt to already-signed-in users
- Render the Stripe form for PAYMENT_OFFLINE bookings
- Inline Math.ceil(bowlerCount / 6) — use getLaneCount()
- Hardcode venue phone or name — use getTenant()
