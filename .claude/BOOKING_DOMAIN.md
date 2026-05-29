# BOOKING_DOMAIN.md
# Booking domain rules, data model, and business logic
#
# DOCUMENT STRUCTURE:
#   PART 1 — Current implementation (accurate to repo as of May 2026)
#   PART 2 — Planned changes (wireframe decisions not yet built)
#
# When Cursor is building something in PART 1, use the schema and rules
# as written. When building something in PART 2, treat those sections as
# the target design and check SCHEMA_MIGRATIONS.md before touching the DB.
#
# This file extends the existing .claude/contracts/PAYMENTS.md — read both.
# PAYMENTS.md owns the Stripe lifecycle. This file owns business rules.

---

# PART 1 — CURRENT IMPLEMENTATION

## The Lock at Confirmation Principle

When a booking reaches CONFIRMED status, its price is locked forever.
The webhook that creates the Booking row is the sole writer.
No subsequent admin setting change can alter what a customer was charged.

This principle is already enforced:
- `confirmBooking()` creates a Stripe PaymentIntent and returns a client_secret
- The Stripe webhook on `payment_intent.succeeded` is the ONLY place
  that creates the Booking row and sets totalAmount
- `Booking.totalAmount` is set once at this moment and never changed

Same discipline extends to policy fields — see Part 2 §Policy Snapshot.

---

## Booking flow — 4 steps (current implementation)

### Step 1 — Bowlers + Date/Time  (`/book`)
Fields captured: bowlerCount, date, timeSlot
- Customer sets bowlerCount (default 1, min 1, max 18)
- laneCount = Math.ceil(bowlerCount / 6) — computed, never user-entered
- bowlerCount > 18: show "Call us for large groups" — no online booking
- Customer selects a date, then a time slot
- Selecting a time slot calls acquireBookingHold() immediately
- Hold uses BookingHold table (see §BookingHold below)
- Hold timer renders in UI — neutral amber, NOT green (not confirmed)

Note: partyType is currently collected here and used to filter packages
in Step 2. This is a PLANNED removal — see Part 2 §partyType Removal.

### Step 2 — Package selection  (`/book/package`)
Fields captured: packageId, selectedPackage, totalAmount
- Packages currently filtered by partyType from Step 1
- Each package has: gameIncluded (bool), shoesIncluded (bool)
- Price footer shows: basePrice ± shoe rental ± games based on flags
- Package detail opens as a bottom sheet (PackageDetailSheet)
- Pricing computed via calculatePrice() — never hardcoded in UI
- Promo code field available — applies PromoCode discount to totalAmount

### Step 3 — MISSING: Bowler/shoe details  (`/book/details`)
This step does not exist yet. The flow currently jumps from
/book/package directly to /book/confirm, skipping shoe sizing entirely.
See Part 2 §Booking Step 3 for the planned design.

### Step 4 — Review + payment  (`/book/confirm`)
Fields captured: customerName, customerEmail, customerPhone, payment
- Summary card: date, time, lanes, bowlers, package, itemized total
- Stripe PaymentIntent created server-side via confirmBooking()
- Client confirms payment via Stripe.js
- On webhook success: Booking row created, CONFIRMED, email sent

### Step 5 — Confirmation  (`/book/success`)
- Confirmation code displayed prominently
- QR code rendered for future staff scanning
- Account creation prompt shown (see Part 2 §Customer Dashboard)
- Confirmation email sent via Resend with QR code and booking details

---

## Booking status machine

```
HOLD        → CONFIRMED | (expires — deleted by lazy cleanup)
CONFIRMED   → CANCELLED | COMPLETED | NO_SHOW
CANCELLED   → (terminal)
COMPLETED   → (terminal)
NO_SHOW     → (terminal)
```

**HOLD**
- Created when customer selects a time slot at /book
- Stored in BookingHold table (NOT a Booking row — see §BookingHold)
- Expires after Tenant.holdTimeoutMins (default 10)
- Expired holds deleted lazily in getAvailableTimeSlots() — no cron

**CONFIRMED**
- Created by Stripe webhook on payment_intent.succeeded
- totalAmount locked at this moment forever
- Confirmation email triggered

**CANCELLED**
- Set by customer self-serve (within cancellationWindowHours window)
  or by staff at any time
- isRefunded boolean flag tracks whether a refund was issued
- Walk-in source = WALK_IN / PHONE: cancel only, no Stripe refund

**COMPLETED**
- Set when booking start/end time has passed

**NO_SHOW**
- Set by staff manually

Note: PENDING_PAYMENT is a planned status for CODE_REQUIRED offline
payment packages. See Part 2 §Unified Package Model.

---

## BookingHold (separate table — not a booking status)

A hold is an availability lock. It is NOT a draft booking.
It has no package, no customer info, no payment.

```
BookingHold {
  id
  tenantId
  startTime
  endTime
  bowlerCount
  laneCount
  expiresAt     ← Tenant.holdTimeoutMins from now
  createdAt
  indexes: (tenantId, startTime, endTime), (expiresAt)
}
```

Hold lifecycle:
1. acquireBookingHold() called when customer selects a time slot
2. Hold row created, holdId + expiresAt returned to client
3. HoldTimer component renders countdown in UI
4. On successful payment: webhook deletes hold + creates Booking atomically
5. On expiry: hold deleted lazily by getAvailableTimeSlots()
   (runs deleteMany({ expiresAt: { lt: now } }) before computing slots)

There is NO cron job for hold release. Lazy cleanup is correct for v1.
STACK_BASELINE.md §9.7 documents this decision.

---

## Booking source

```
BookingSource: ONLINE | WALK_IN | PHONE
```

- ONLINE: customer booking flow at /book
- WALK_IN: staff cockpit walk-in form (bypasses Stripe, CONFIRMED immediately)
- PHONE: staff cockpit, booking taken by phone

Source affects refund eligibility — WALK_IN and PHONE have no Stripe
payment so Stripe refunds are unavailable for those bookings.

---

## Lane availability rule

A time slot is UNAVAILABLE if:
- Any confirmed Booking overlaps that (tenantId × time × laneCount)
- Any non-expired BookingHold overlaps that range
- Any BlockedSlot covers that time for those lanes
- The slot falls outside OperatingHours for that day

getAvailableTimeSlots() unions CONFIRMED bookings with non-expired holds
before computing what's free. Expired holds are deleted in the same query.

---

## Lane assignment

```typescript
laneCount = Math.ceil(bowlerCount / 6)
```

This is currently hardcoded as 6 in src/lib/lane-logic.ts.
See Part 2 §bowlersPerLane for the planned tenant-configurable version.

getLaneCount(bowlerCount) is the only function that should do this math.
Never inline Math.ceil(bowlerCount / 6) in a component or page.

---

## Database schema (current — all money is integer cents)

### Tenant
```prisma
model Tenant {
  id               String  @id @default(cuid())
  name             String
  slug             String  @unique
  address          String
  phone            String
  timezone         String  @default("America/New_York")
  themeSlug        String  @default("default")
  holdTimeoutMins  Int     @default(10)
  maxOnlineBowlers Int     @default(18)
  config           Json    @default("{}")
  // config JSON currently stores:
  //   cancellationWindowHours (Int, default 24)
  //   cancellationRefundPercent (Int 0-100, default 100)
  // These will move to typed columns — see Part 2 §Policy Snapshot
}
```

### Booking
```prisma
model Booking {
  id               String        @id @default(cuid())
  tenantId         String
  userId           String?       // null = guest
  confirmationCode String        @unique
  partyType        PartyType
  bowlerCount      Int
  laneCount        Int           // ceil(bowlerCount/6)
  startTime        DateTime
  endTime          DateTime
  packageId        String
  status           BookingStatus @default(HOLD)
  source           BookingSource @default(ONLINE)
  customerName     String
  customerEmail    String
  customerPhone    String?
  totalAmount      Int           // integer cents — e.g. 4500 = $45.00
  discountAmount   Int           @default(0)
  promoCodeId      String?
  notes            String?
  isRefunded       Boolean       @default(false)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

enum BookingStatus { HOLD CONFIRMED CANCELLED COMPLETED NO_SHOW }
enum BookingSource { ONLINE WALK_IN PHONE }
enum PartyType     { OPEN BIRTHDAY CORPORATE COSMIC }
```

### Package (current model)
```prisma
model Package {
  id            String      @id @default(cuid())
  tenantId      String
  name          String
  description   String?
  basePrice     Int         // integer cents
  gameIncluded  Boolean     @default(false)
  shoesIncluded Boolean     @default(false)
  gameCostPer   Int?        // cents per game when not included
  shoeCostPer   Int?        // cents per pair when not included
  partyTypes    PartyType[]
  active        Boolean     @default(true)
  sortOrder     Int         @default(0)
}
```

### PromoCode (current model — planned replacement in Part 2)
```prisma
model PromoCode {
  id            String            @id @default(cuid())
  tenantId      String
  code          String            // stored lowercase; unique per tenant
  description   String?
  discountType  PromoDiscountType // PERCENT | FIXED
  discountValue Int               // percent (1-100) or cents
  maxUses       Int?
  usesCount     Int               @default(0)
  expiresAt     DateTime?
  active        Boolean           @default(true)
}
```

### Payment
```prisma
model Payment {
  id                    String       @id @default(cuid())
  bookingId             String       @unique
  stripePaymentIntentId String?      @unique
  amount                Int          // integer cents
  status                String       // Stripe PI status strings
  stripeRefundId        String?
  refundAmount          Int?         // integer cents
  refundStatus          RefundStatus @default(NONE)
  refundReason          String?
  refundedAt            DateTime?
  refundedBy            String?      // userId of staff who issued refund
}

enum RefundStatus { NONE PENDING SUCCEEDED FAILED }
```

### Supporting models
```prisma
model Lane         { id, tenantId, number Int, active Boolean }
model BookingLane  { bookingId, laneId — composite PK }
model BlockedSlot  { id, tenantId, startTime, endTime, reason?, lanes Int[] }
model AuditLog     { id, bookingId?, userId?, action, entityType,
                     entityId, details Json?, createdAt }
model BookingHold  { id, tenantId, startTime, endTime, bowlerCount,
                     laneCount, expiresAt, createdAt }
model StripeEvent  { id (evt_…), type, payload Json, processedAt }
model OperatingHours { id, tenantId, dayOfWeek Int, openTime, closeTime,
                       closed Boolean }

enum CancellationReason {
  CUSTOMER_REQUEST NO_SHOW VENUE_ISSUE SYSTEM_EXPIRED
}
```

---

## Pricing logic (src/lib/pricing.ts)

```typescript
interface PricingInput {
  package:       Package
  bowlerCount:   number
  gamesPerBowler?: number   // default 2
}

interface PricingResult {
  baseAmount:  number   // integer cents
  gameAmount:  number   // 0 if gameIncluded
  shoeAmount:  number   // 0 if shoesIncluded
  totalAmount: number
  lineItems:   LineItem[]
}

function calculatePrice(input: PricingInput): PricingResult
```

calculatePrice() is the only function that does pricing math.
Never calculate price in a component or API route directly.
All amounts in and out are integer cents.

---

## Cancellation policy (current — stored in Tenant.config JSON)

getCancellationPolicy(tenant) reads from Tenant.config:
- cancellationWindowHours (default 24): hours before booking start
  within which the customer can self-serve cancel
- cancellationRefundPercent (default 100): percent refunded (0–100)

Customer self-serve cancel is at /find-my-booking (no account required):
- Lookup by email + confirmation code
- If within cancellationWindowHours: cancel + trigger Stripe refund
- If outside window: show "please contact us" with venue phone

These values will become proper schema columns — see Part 2 §Policy Snapshot.

---

## Refund rules

Show refund option when ALL true:
- booking has a Payment record
- payment.status = 'succeeded'
- payment.stripeRefundId IS NULL (not already refunded)
- booking.status != 'CANCELLED'
- current user role = MANAGER or ADMIN

Walk-in / phone bookings (source = WALK_IN | PHONE):
- No Stripe payment — cancel only, no Stripe refund toggle
- MANAGER+ can use manualRefundBookingAction for cash refunds

Refund endpoint: POST /api/staff/bookings/[id]/refund — MANAGER+ only
All refund operations create an AuditLog entry.
See .claude/contracts/PAYMENTS.md for the full refund lifecycle.

---

## Availability API

GET /api/bookings/availability?tenantId=&date=&laneCount=
Returns array of available TimeSlot objects.

A slot is UNAVAILABLE if:
- Any confirmed Booking or non-expired BookingHold overlaps it
- A BlockedSlot covers that time for those lanes
- Falls outside OperatingHours for that day/venue

---

## API routes (current)

```
/api/bookings/availability        GET  — public, returns open slots
/api/bookings/hold                POST — acquire BookingHold
/api/bookings/hold/[id]/release   DELETE — release BookingHold early
/api/bookings/confirm             POST — create PaymentIntent
/api/bookings/[code]/ics          GET  — calendar download (.ics)
/find-my-booking                  GET  — customer self-serve lookup
/api/staff/bookings               GET  — list (role: STAFF+)
/api/staff/bookings/[id]          GET  — booking detail
/api/staff/bookings/[id]/refund   POST — Stripe refund (MANAGER+)
/api/staff/bookings/[id]/checkin  POST — mark checked in
/api/admin/packages               GET POST PATCH DELETE (ADMIN)
/api/admin/settings               GET PATCH (ADMIN)
/api/webhooks/stripe              POST — Stripe webhook handler
```

---

## Key rules for Cursor (current)

- Never call calculatePrice() on the client — server-side only
- Never hardcode venue name, address, or phone — use getTenant()
- Never hardcode 6 for lane count — use getLaneCount(bowlerCount)
- STAFF cannot refund — MANAGER or ADMIN only, server-side
- Walk-in bookings cannot be Stripe-refunded — use manualRefundBookingAction
- Booking.totalAmount is integer cents — never Decimal, never float
- All money in and out of calculatePrice() is integer cents
- BookingHold is a separate table — HOLD is a deprecated status
- Never import stripe directly — only through src/lib/stripe.ts
- Never import resend directly — only through src/lib/email.ts

---

# PART 2 — PLANNED CHANGES FROM WIREFRAME SESSION

## How to read Part 2

These sections document decisions made during the product
redesign wireframe session. They are NOT yet implemented.

Before building anything in Part 2:
1. Read .claude/SCHEMA_MIGRATIONS.md for migration order
2. Confirm the migration has been run against the DB
3. Do not assume any Part 2 field exists until you verify
   it in the live schema (npx prisma db pull)

---

## partyType Removal from Customer Flow  [PLANNED]

Decision: party type selection is removed from the customer
booking flow. The package a customer selects implies their
party type. partyType is no longer asked directly.

Current state: book/page.tsx still collects partyType at
Step 1 and passes it to the package step for filtering.

Planned change:
- Remove partyType picker from book/page.tsx
- Remove partyType from BookingSession in BookingContext
- When Booking is created, derive partyType from the
  selected package's partyTypes array (first value)
- partyType remains on the Booking record for staff/reporting

Requires: book/page.tsx refactor, BookingContext update.
No schema migration needed (partyType column stays).

---

## Booking Step 3 — Bowler/Shoe Details  [PLANNED]

Decision: add a dedicated step between package selection
and payment for per-bowler shoe size collection.

Route: /book/details (does not exist yet)

Design (from docs/wireframes/customer/booking-step3-dropdown.html):
- One row per bowler with a shoe size dropdown
- Dropdown first option: "Own shoes" (sets cost to $0)
- Grouped sizes: Youth (girls/boys 1–6), Adult Women (5–13),
  Adult Men (6–15)
- "Own shoes" warning banner if any bowler selects it
- Price footer updates live per selection
- All shoe sizes required before Continue is enabled

Booking flow becomes: /book → /book/package → /book/details
→ /book/confirm → /book/success

Requires:
- New page: src/app/(customer)/book/details/page.tsx
- New BookingSession fields: shoeSelections[] per bowler
- calculatePrice() update to accept shoeSelections input
- BookingContext: add setShoeSelections()

Default bowler count: wireframe decisions specified default 2,
minimum 1. Current BookingContext has DEFAULT_BOWLER_COUNT = 1.
This should be updated to 2 when step 3 is built.

---

## Policy Snapshot on Booking  [PLANNED — Migration 1]

Decision: at CONFIRMED time, snapshot policy values from
tenant settings onto the booking record. Policy changes
apply to new bookings only. Existing bookings retain the
policy that applied when they were created.

Planned Tenant columns (replacing Tenant.config keys):
```
cancellationWindowHours  Int  default 24
rescheduleWindowHours    Int  default 24
checkInWindowMinutes     Int  default 60  (30 min min, 4hr max)
bowlersPerLane           Int  default 6
```

Planned Booking snapshot columns:
```
cancellationWindowHoursSnapshot  Int
rescheduleWindowHoursSnapshot    Int
bowlersPerLaneSnapshot           Int
```

Self-serve eligibility MUST read from booking snapshot fields,
never from current Tenant settings.

Note: cancellationWindowHours currently exists in Tenant.config
JSON (readable via getCancellationPolicy()). Migration moves
it to a proper typed column.

See SCHEMA_MIGRATIONS.md Migration 1.

---

## bowlersPerLane as Tenant Configuration  [PLANNED — Migration 1]

Decision: bowlersPerLane is tenant-configurable, not hardcoded.
Default is 6. Royal Z uses 6, another venue might use 4 or 8.

When Migration 1 runs:
- Add bowlersPerLane Int to Tenant (default 6)
- Update getLaneCount() to accept bowlersPerLane parameter
- BookingContext must pass tenant.bowlersPerLane
- laneCount on Booking is ceil(bowlerCount / tenant.bowlersPerLane)
- Snapshot bowlersPerLane onto Booking at CONFIRMED time

Until migration: Math.ceil(bowlerCount / 6) remains correct.
Do not change lane-logic.ts before Migration 1 is complete.

---

## Consent Fields on Booking  [PLANNED — Migration 2]

Decision: three separate consent types, independently stored.

```
smsReminderConsent  Boolean  default false  // opt-in per booking
marketingConsent    Boolean  default false  // opt-in ongoing
// transactional email: no opt-in needed, always sent
```

These are legally distinct:
- Transactional (confirmations, receipts): no opt-in required
- SMS reminders: opt-in tied to this specific booking
- Marketing: opt-in ongoing, applies across all bookings

UI location: Step 4 (/book/confirm) — checkboxes below
customer contact fields. Marketing default must be OFF.

See SCHEMA_MIGRATIONS.md Migration 2.

---

## Inclusions System  [PLANNED — Migration 3]

Decision: replace boolean flags with a structured inclusions
list supporting 4 types.

Current: gameIncluded (bool), shoesIncluded (bool),
         gameCostPer (int), shoeCostPer (int)

Planned inclusion types:
```typescript
enum InclusionType {
  GAMES        // bowling games
  SHOE_RENTAL  // shoe rental (when included, hides shoe step)
  FOOD         // food items (pizza, pitchers, etc.)
  GAME_CREDITS // arcade credits — dollar value or credit units
}
```

Each inclusion has: type, name, quantity, perPerson (bool), notes.
Custom inclusion types deferred to v3 via PackageInclusion table.

See SCHEMA_MIGRATIONS.md Migration 3.

---

## Unified Package Model — CODE_REQUIRED  [PLANNED — Migration 4]

Decision: PromoCode entity replaced by CODE_REQUIRED packages.
Everything is a Package. Access type determines visibility.

Visual spec: docs/wireframes/admin/settings-packages-unified.html

Planned Package additions:
```
accessType    String  default 'PUBLIC'   // PUBLIC | CODE_REQUIRED
pricingType   String?                   // RATE_BASED | RATE_DISCOUNT | OVERRIDE
codeString    String?                   // unique per tenant, uppercase
discountType  String?                   // PERCENT | FIXED
discountValue Int?                      // percent or cents
expiresAt     DateTime?
usageLimit    Int?
usageCount    Int     default 0
paymentMode   String?                   // ONLINE | PAYMENT_OFFLINE
```

CODE_REQUIRED package behavior:
- Hidden from /book/package list
- Unlocked when customer enters code at Step 4 (/book/confirm)
- PAYMENT_OFFLINE mode: Stripe bypassed, booking created as
  PENDING_PAYMENT (new status needed), staff confirms payment
- CODE_REQUIRED is standalone — it is NOT a modifier of another package

PromoCode model: do not delete until all PromoCode data has been
migrated to CODE_REQUIRED packages and admin UI is updated.
.claude/contracts/PROMO_CODES.md documents the OLD model.

Admin UI target: Packages list with PUBLIC / Code-gated filter tabs,
replacing the separate Promos nav item.

PENDING_PAYMENT status (planned addition to BookingStatus):
```
PENDING_PAYMENT — CODE_REQUIRED + PAYMENT_OFFLINE package used.
  Lanes held indefinitely (no expiry).
  Staff cockpit shows "Payment pending" badge.
  Cannot be self-serve cancelled by customer.
  Transitions to CONFIRMED when MANAGER+ confirms payment received.
  Excluded from no-show logic.
```

See SCHEMA_MIGRATIONS.md Migration 4.

---

## Pricing Periods  [PLANNED — Migration 5]

Decision: admin-configurable time-based pricing periods.
Rate-based packages use: people × hours × period rate.

Priority stack (holiday wins over weekend wins over weekday):
```
specificDates match → highest priority
daysOfWeek SAT/SUN  → second priority
default period      → fallback (must always exist)
```

New PricingPeriod table:
```
id, tenantId, name, ratePerPersonPerHour Int (cents),
daysOfWeek Int[], startTime String, endTime String,
specificDates DateTime[], priority Int
```

calculatePrice() must be updated to:
1. Accept startTime as input
2. Resolve the matching PricingPeriod for tenant + startTime
3. Use period.ratePerPersonPerHour for RATE_BASED packages
4. OVERRIDE packages ignore period rates (use package.basePrice)

Venue must always have a default period (priority 0).
Admin settings validation prevents saving without one.

See SCHEMA_MIGRATIONS.md Migration 5.

---

## Customer Dashboard  [PLANNED — requires Migration 1 + ClaimToken]

Decision: /dashboard for authenticated customers showing
upcoming bookings with self-serve cancel/reschedule.

Does not exist yet. Current self-serve path: /find-my-booking
(guest, no account required — this path stays as fallback).

Planned dashboard features:
- Featured booking card (dark --surface-dark bg) for next upcoming
- Secondary upcoming booking cards
- Cancel/reschedule as bottom sheets (stay on dashboard, no navigation)
- Self-serve eligibility reads from booking snapshot fields
  (cancellationWindowHoursSnapshot, rescheduleWindowHoursSnapshot)
  NOT from current tenant settings
- Preferences sheet: SMS reminder toggle, marketing toggle
  (marketing default OFF)
- Past bookings section (read-only in v1)

Account creation (ClaimToken flow):
- Customer sees "Create account" prompt on /book/success
- Email pre-filled from booking contact info
- After account creation: booking.userId backfilled
- ClaimToken: single-use, expires 24h after booking confirmation

Dependencies: Migration 1 (policy snapshot fields),
ClaimToken table (not yet in schema).

See .claude/CUSTOMER_DASHBOARD.md for full interaction spec.

---

## Key Rules for Cursor (planned features)

- Do not add PENDING_PAYMENT to BookingStatus enum until
  Migration 4 has been reviewed and approved
- Do not remove partyType from book/page.tsx until the
  package → partyType inference logic is in place
- Do not delete PromoCode model until CODE_REQUIRED migration
  is complete and all data migrated
- Do not change getLaneCount() signature until Migration 1 runs
- Always check SCHEMA_MIGRATIONS.md before touching schema.prisma
- Part 2 sections are target design — confirm schema exists before
  writing code that references those fields

