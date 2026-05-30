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
#
# Related docs (Part 1):
#   BOOKING_INTERACTIONS.md — customer step UX (hold timer, footer, sheets)
#   PAYMENTS.md — Stripe PaymentIntent + webhook lifecycle
#   contracts/PROMO_CODES_DEPRECATED.md — current PromoCode contract (deprecated)
#   SCHEMA_MIGRATIONS.md — gates Part 2 schema work
#   STAFF_INTERACTIONS.md + staff/0N_*.md — staff/admin surfaces
#   CUSTOMER_DASHBOARD.md — post-booking dashboard (not yet built)

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

## Booking flow — 4 active steps (Step 3 not built; 5 screens total)

UX detail for each step: `BOOKING_INTERACTIONS.md`.

### Step 1 — Bowlers + Date/Time  (`/book`)
Fields: bowlerCount, partyType, date, timeSlot, holdId
- bowlerCount default 1, min 1, max 18; laneCount via getLaneCount()
- partyType filters Step 2 packages (planned removal — Part 2 §partyType Removal)
- Selecting a time slot → acquireBookingHold() (BookingHold table)
- Availability via getAvailableDates() / getAvailableTimeSlots()

### Step 2 — Package selection  (`/book/package`)
Fields: packageId, selectedPackage, totalAmount (preview)
- Packages filtered by partyType from Step 1 (planned removal — Part 2)
- Pricing via calculatePrice(); package optional

### Step 3 — MISSING  (`/book/details`)
Flow skips to /book/confirm. See Part 2 §Booking Step 3.

### Step 4 — Review + payment  (`/book/confirm`)
Fields: customerName, customerEmail, customerPhone, promoCode, payment
- Promo: validatePromoCode() → confirmBooking() re-validates (PROMO_CODES_DEPRECATED.md)
- confirmBooking() → Stripe PaymentIntent; webhook creates CONFIRMED Booking

### Step 5 — Confirmation  (`/book/success`)
Lookup via getBookingByPaymentIntentId(). Account prompt: Part 2 §Customer Dashboard.

---

## Booking status machine

Online bookings are created as **CONFIRMED** by the Stripe webhook — they
never pass through `BookingStatus.HOLD`. The `HOLD` enum value is legacy;
availability locking uses the **BookingHold** table instead (see below).

```
BookingHold   → (expires — deleted by lazy cleanup) | deleted on payment success
CONFIRMED     → CANCELLED | COMPLETED | NO_SHOW
CANCELLED     → (terminal)
COMPLETED     → (terminal)
NO_SHOW       → (terminal)
```

**BookingHold** (not a Booking status — see §BookingHold)
- Created when customer selects a time slot at /book
- Stored in BookingHold table only — no Booking row exists yet
- Expires after Tenant.holdTimeoutMins (default 10)
- Expired holds deleted lazily in getAvailableTimeSlots() — no cron
- On successful payment: webhook deletes hold + creates CONFIRMED Booking atomically

**CONFIRMED**
- Created by Stripe webhook on payment_intent.succeeded (online flow)
- Also set immediately on walk-in/phone bookings (no Stripe)
- totalAmount locked at this moment forever
- Confirmation email triggered (online flow)

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

### Staff surfaces (UX vs domain)

| Concern | Owner doc |
|---------|-----------|
| Global chrome, sheets/panels, NavRail, toasts | `STAFF_INTERACTIONS.md` |
| Per-surface interaction specs | `staff/01`–`07` (see index table there) |
| Walk-in, blocking, schedule server actions | This file §Staff server actions |
| Refunds, status machine, lane logic | This file Part 1 |
| Code paths, layout auth, pattern rules | `contracts/STAFF.md` |

Walk-in bookings: `createWalkInBooking()` → CONFIRMED immediately, no Stripe.
UX spec: `staff/02_LANES_WALKIN.md`.

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

Snippets below are abbreviated for reading. **Canonical source:** `prisma/schema.prisma`
(includes `@map` column names, indexes, and all relations).

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
  // Relations: bookings, bookingHolds, packages, lanes, users,
  //            operatingHours, blockedSlots, promoCodes
  // config JSON currently stores:
  //   cancellationWindowHours (Int, default 24)
  //   cancellationRefundPercent (Int 0-100, default 100)
  // These will move to typed columns — see Part 2 §Policy Snapshot
}
```

### User
```prisma
model User {
  id           String   @id @default(cuid())
  tenantId     String?  // null = customer (no venue affiliation)
  email        String   @unique
  name         String?
  phone        String?
  role         Role     @default(CUSTOMER)
  passwordHash String?  // bcrypt; null only for future OAuth users
  createdAt    DateTime @default(now())
  bookings     Booking[]
  tenant       Tenant?  @relation(...)
}

enum Role { CUSTOMER STAFF MANAGER ADMIN }
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
  status           BookingStatus @default(HOLD)  // online bookings written CONFIRMED
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
// HOLD is legacy — see schema.prisma comment; new online bookings skip HOLD.
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
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  @@unique([tenantId, code])
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
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt
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

Refunds are **server actions** in `src/lib/actions/refund.ts` — not REST routes:
- `refundBookingAction()` — Stripe refund (MANAGER+ only)
- `manualRefundBookingAction()` — walk-in/phone cash refund (MANAGER+ only)

All refund operations create an AuditLog entry.
See `.claude/contracts/PAYMENTS.md` for the full refund lifecycle.

---

## Availability and booking operations

Booking domain logic runs as **Next.js server actions**, not `/api/bookings/*`
REST routes. Customer pages call these directly from the client.

### Customer booking — `src/lib/actions/booking.ts`

| Action | Auth | Purpose |
|--------|------|---------|
| `getAvailableDates(tenantId, daysAhead)` | Public | Dates with at least one open slot |
| `getAvailableTimeSlots(tenantId, date, laneCount)` | Public | Time slots for a date; lazy-deletes expired holds first |
| `acquireBookingHold(input)` | Public | Create BookingHold; returns holdId + expiresAt |
| `releaseBookingHold(holdId)` | Public | Release hold early (e.g. slot change) |
| `getPackagesForTenant(tenantId, partyType?)` | Public | Active packages for Step 2 |
| `confirmBooking(input)` | Public | Re-validates price + promo; creates Stripe PaymentIntent |
| `getBookingByPaymentIntentId(piId)` | Public | Success page lookup after payment |

A slot is UNAVAILABLE if:
- Any CONFIRMED Booking or non-expired BookingHold overlaps it
- A BlockedSlot covers that time for those lanes
- Falls outside OperatingHours for that day/venue

### Promo — `src/lib/actions/promo.ts`

| Action | Auth | Purpose |
|--------|------|---------|
| `validatePromoCode(tenantId, code, subtotalCents)` | Public | Preview discount; does NOT increment usesCount |

Full promo lifecycle: `contracts/PROMO_CODES_DEPRECATED.md`.

### Customer self-serve — `src/lib/actions/customer.ts`

| Action | Auth | Purpose |
|--------|------|---------|
| `getBookingByLookup(email, code)` | Public | Find booking by email + confirmation code |
| `cancelBookingAction(input)` | Public | Self-serve cancel within policy window |

Pages: `/find-my-booking`, `/find-my-booking/[code]` (not API routes).

### Staff — `src/lib/actions/staff.ts`

| Action | Auth | Purpose |
|--------|------|---------|
| `getTodayBookings(tenantId)` | STAFF+ | Cockpit today's list |
| `getScheduleForDate(tenantId, date)` | STAFF+ | Schedule grid |
| `getBookingDetail(bookingId)` | STAFF+ | Booking detail panel |
| `createWalkInBooking(input)` | STAFF+ | Walk-in/phone booking (CONFIRMED, no Stripe) |
| `blockLanes(input)` / `unblockLanes(id)` | STAFF+ | Schedule lane blocking |

Check-in flow: **not yet implemented** (no server action exists).

### Refunds — `src/lib/actions/refund.ts`

| Action | Auth | Purpose |
|--------|------|---------|
| `refundBookingAction(input)` | MANAGER+ | Stripe refund |
| `manualRefundBookingAction(input)` | MANAGER+ | Walk-in/phone manual refund |

### Payment resume — `src/lib/actions/payment-resume.ts`

| Action | Auth | Purpose |
|--------|------|---------|
| `createPaymentResumeLink(bookingId)` | STAFF+ | Link for abandoned checkout |
| `getResumePaymentClientSecret(token)` | Public | Resume Stripe payment |

### Admin — `src/lib/actions/admin.ts`

Tenant, operating hours, packages, promos, team, audit log, and reports —
all MANAGER+ or ADMIN+ per action. See `contracts/ADMIN.md`.

---

## HTTP route handlers (not server actions)

```
GET  /api/bookings/[code]/ics     — calendar download (.ics); rate-limited
POST /api/webhooks/stripe         — Stripe webhook (signature verified in prod)
GET/POST /api/auth/[...nextauth]  — Auth.js handlers
GET  /api/health                  — deployment smoke check (DB, tenant, auth config)
```

---

## Key rules for Cursor (current)

- PaymentIntent amounts come from `confirmBooking()` — never trust client-supplied totals
- `calculatePrice()` may run on the client for display preview; server always re-runs at confirm
- Never hardcode venue name, address, or phone — use getTenant()
- Never hardcode 6 for lane count — use getLaneCount(bowlerCount)
- STAFF cannot refund — MANAGER or ADMIN only, server-side
- Walk-in bookings cannot be Stripe-refunded — use manualRefundBookingAction
- Booking.totalAmount is integer cents — never Decimal, never float
- All money in and out of calculatePrice() is integer cents
- Availability locks use BookingHold table — not BookingStatus.HOLD
- Promo UI is at `/book/confirm` only — see PROMO_CODES_DEPRECATED.md
- Never import stripe directly — only through src/lib/stripe.ts
- Never import resend directly — only through src/lib/email.ts

---

# PART 2 — PLANNED CHANGES FROM WIREFRAME SESSION

## How to read Part 2

These sections document decisions made during the product
redesign wireframe session. They are NOT yet implemented.

Before building anything in Part 2:
1. Read `.claude/SCHEMA_MIGRATIONS.md` for migration order
2. Confirm the migration has been run against the DB
3. Do not assume any Part 2 field exists until you verify
   it in the live schema (`npx prisma db pull`)

### Part 2 section → migration map

| Part 2 section | Migration | Schema change? |
|----------------|-----------|----------------|
| partyType Removal | — | No (UI + inference only) |
| Booking Step 3 (shoe sizing) | — | No (UI + calculatePrice input) |
| Policy Snapshot | **1** | Tenant columns + Booking snapshot fields |
| bowlersPerLane (Tenant column + snapshot) | **1** | Part of Migration 1 |
| bowlersPerLane (getLaneCount + call sites) | **6** | No — code only; requires Migration 1 |
| Consent Fields | **2** | Booking columns |
| Inclusions System | **3** | Package.inclusions JSON |
| Unified Package / CODE_REQUIRED | **4** | Package fields + PENDING_PAYMENT enum |
| Pricing Periods | **5** | PricingPeriod table |
| Customer Dashboard | **1 + 7** | Migration 1 snapshots; Migration 7 ClaimToken |

Run migrations in numeric order. Migration 6 requires Migration 1 complete.
Migration 4 requires Migration 3. Customer dashboard requires 1 and 7.

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

## Booking Step 3 — Bowler/Shoe Details  [PLANNED — no migration]

Decision: add a dedicated step between package selection
and payment for per-bowler shoe size collection.

Route: /book/details (does not exist yet)

UX spec: `BOOKING_INTERACTIONS.md` §Step 3.
Wireframe: `docs/wireframes/customer/booking-step3-dropdown.html`.

Booking flow becomes: /book → /book/package → /book/details
→ /book/confirm → /book/success

Requires (no schema migration):
- New page: `src/app/(customer)/book/details/page.tsx`
- New BookingSession fields: shoeSelections[] per bowler
- calculatePrice() update to accept shoeSelections input
- BookingContext: add setShoeSelections()

Default bowler count: wireframe target is 2 (code is still 1 until this ships).

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

Note: Migration 1 adds the `bowlersPerLane` Tenant column and
`bowlersPerLaneSnapshot` on Booking. **Code changes** to
`getLaneCount()` and all call sites are **Migration 6** — do not
bundle them into Migration 1.

---

## bowlersPerLane — code changes  [PLANNED — Migration 6]

Decision: bowlersPerLane is tenant-configurable, not hardcoded.
Default is 6. Royal Z uses 6, another venue might use 4 or 8.

**Prerequisite:** Migration 1 complete (`Tenant.bowlersPerLane` column exists).

When Migration 6 runs:
- Update `getLaneCount(bowlerCount, bowlersPerLane = 6)` in lane-logic.ts
- Every call site passes `tenant.bowlersPerLane`
- BookingContext loads tenant.bowlersPerLane for live lane count display
- laneCount on Booking uses ceil(bowlerCount / tenant.bowlersPerLane)
- Snapshot already handled by Migration 1 webhook changes

Until Migration 6: `getLaneCount(bowlerCount)` with hardcoded 6 remains correct.
Do not change lane-logic.ts until Migration 1 is confirmed complete.

See SCHEMA_MIGRATIONS.md Migration 6.
Update `.cursorrules` lane-count rule after Migration 6:
`getLaneCount(bowlerCount, tenant.bowlersPerLane)`.

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
.claude/contracts/PROMO_CODES_DEPRECATED.md documents the OLD model.

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

## Customer Dashboard  [PLANNED — requires Migration 1 + 7]

`/dashboard` does not exist. Guest self-serve remains at `/find-my-booking`.

**Dependencies:** Migration 1 (policy snapshot on Booking), Migration 7 (ClaimToken
for account linking). ClaimToken table is not in schema yet.

**Domain decisions:** self-serve cancel/reschedule reads booking snapshot fields,
not current tenant settings; `/find-my-booking` stays as guest fallback.

Full UX spec: `.claude/CUSTOMER_DASHBOARD.md`.
Wireframes: `docs/wireframes/customer/`.

---

## Key Rules for Cursor (planned features)

- Do not add PENDING_PAYMENT to BookingStatus enum until
  Migration 4 has been reviewed and approved
- Do not remove partyType from book/page.tsx until the
  package → partyType inference logic is in place
- Do not delete PromoCode model until CODE_REQUIRED migration
  is complete and all data migrated
- Do not change getLaneCount() signature until **Migration 6**
  (requires Migration 1 column to exist first)
- Do not implement Part 2 UI that reads snapshot fields until
  Migration 1 has been run and verified in schema
- Always check SCHEMA_MIGRATIONS.md before touching schema.prisma
- Part 2 sections are target design — confirm schema exists before
  writing code that references those fields

