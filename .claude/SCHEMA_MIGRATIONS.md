# SCHEMA_MIGRATIONS.md
# Planned Prisma schema migrations from wireframe design decisions
#
# Read this before touching schema.prisma in any Cursor session.
# Migrations must be run in dependency order.
# Do not implement Part 2 features in BOOKING_DOMAIN.md until
# the relevant migration here has been reviewed, approved, and run.
#
# Status: all migrations are PLANNED — none have been run yet.
#
# Cross-reference: BOOKING_DOMAIN.md Part 2 sections map to migrations
# in the table below. UX-only Part 2 items (partyType removal, Step 3
# shoes) require no migration.

---

## How to use this file

Before any schema change:
1. Find the relevant migration below (or the Part 2 → migration map in
   BOOKING_DOMAIN.md Part 2)
2. Check its "Depends on" field — run dependencies first
3. Get review before running: schema changes affect all existing data
4. After running: update Status to COMPLETE with date

### BOOKING_DOMAIN Part 2 → migration quick reference

| Part 2 section | Migration |
|----------------|-----------|
| partyType Removal | — (no migration) |
| Booking Step 3 | — (no migration) |
| Policy Snapshot | 1 |
| bowlersPerLane column + snapshot | 1 |
| bowlersPerLane getLaneCount() code | 6 (after 1) |
| Consent Fields | 2 |
| Inclusions System | 3 |
| CODE_REQUIRED / PENDING_PAYMENT | 4 (after 3) |
| Pricing Periods | 5 |
| Customer Dashboard | 1 + 7 |

---

## Migration 1 — Policy fields on Tenant + Booking
Status: PLANNED
Priority: High — blocks customer dashboard + self-serve cancel/reschedule

### Why
Wireframe decision: at CONFIRMED time, snapshot policy values from
tenant settings onto the booking. Policy changes apply to new bookings
only. Existing bookings retain the policy that applied when created.

Currently cancellationWindowHours lives in Tenant.config JSON
(readable via getCancellationPolicy() in src/lib/tenant.ts).
This migration promotes it to a typed column and adds the others.

### Changes to Tenant
```prisma
// ADD these columns:
cancellationWindowHours  Int  @default(24)
rescheduleWindowHours    Int  @default(24)
checkInWindowMinutes     Int  @default(60)   // 30 min min, 4hr max
bowlersPerLane           Int  @default(6)

// NOTE: cancellationWindowHours currently in Tenant.config JSON.
// After migration: read from typed column, not config JSON.
// getCancellationPolicy() in src/lib/tenant.ts must be updated.
```

### Changes to Booking
```prisma
// ADD these snapshot columns:
cancellationWindowHoursSnapshot  Int
rescheduleWindowHoursSnapshot    Int
bowlersPerLaneSnapshot           Int
```

### Code changes required after migration
- src/lib/tenant.ts: getCancellationPolicy() reads new column
- src/lib/actions/admin.ts: AdminTenantDetail interface adds new fields
- Booking creation (webhook handler): snapshot all 3 values at CONFIRMED
- Customer dashboard cancel/reschedule: read from snapshot, not tenant
- getLaneCount() update: see Migration 6

Depends on: nothing
Blocks: Migration 6, customer dashboard (with Migration 7)

Note: Part 2 §partyType Removal and §Booking Step 3 require no migration.

---

## Migration 2 — Consent fields on Booking
Status: PLANNED
Priority: Medium — legal requirement before marketing outreach

### Why
Wireframe decision: three legally distinct consent types stored
as separate fields. Marketing opt-in must default false.

### Changes to Booking
```prisma
// ADD:
smsReminderConsent  Boolean  @default(false)
marketingConsent    Boolean  @default(false)
// transactionalConsent: no field needed — always sent, no opt-in required
```

### UI required after migration
- /book/confirm: add consent checkboxes below contact fields
  - "Send me a text reminder before my booking" (smsReminderConsent)
  - "Send me promotions and news from [venue]" (marketingConsent)
  - Both default UNCHECKED — marketing especially must default off
- Booking creation: write consent values from form submission

Depends on: nothing
Blocks: SMS reminder integration, marketing campaigns

---

## Migration 3 — Inclusions system on Package
Status: PLANNED
Priority: Medium — needed for food/game credit packages

### Why
Wireframe decision: replace simple boolean flags with a structured
inclusion list supporting 4 types: GAMES, SHOE_RENTAL, FOOD, GAME_CREDITS.

### Changes to Package
```prisma
// ADD:
inclusions  Json  @default("[]")

// inclusions JSON shape:
// [
//   {
//     type: "GAMES" | "SHOE_RENTAL" | "FOOD" | "GAME_CREDITS",
//     name: string,           // "2 games per person", "Large pizza"
//     quantity: number,
//     perPerson: boolean,     // true = quantity × bowlerCount
//     notes: string | null,   // free text for staff
//     amount: number | null   // for GAME_CREDITS only (integer cents)
//   }
// ]

// KEEP existing flags during transition:
// gameIncluded, shoesIncluded, gameCostPer, shoeCostPer
// Remove them in a follow-up migration after inclusions is live
```

### Code changes required after migration
- calculatePrice(): update to read inclusions array instead of boolean flags
  - If SHOE_RENTAL in inclusions: set shoeAmount = 0
  - If GAMES in inclusions: set gameAmount = 0
- Package admin UI: replace checkbox flags with inclusion builder
- Booking confirmation email: list inclusions by name

Custom inclusion types (v3): deferred via PackageInclusion join table.
Do not build this in v1/v2.

Depends on: nothing
Blocks: Migration 4

---

## Migration 4 — Unified Package model (CODE_REQUIRED)
Status: PLANNED
Priority: Medium — replaces PromoCode entity

### Why
Wireframe decision: PromoCode as a separate entity is eliminated.
Everything is a Package. ACCESS type determines visibility.
CODE_REQUIRED packages are unlocked by entering a code at checkout.

Visual spec: docs/wireframes/admin/settings-packages-unified.html

### Changes to Package
```prisma
// ADD:
accessType    String   @default("PUBLIC")
// "PUBLIC" — visible to all customers in booking flow
// "CODE_REQUIRED" — hidden until customer enters code at /book/confirm

pricingType   String?
// "RATE_BASED"     — uses pricing periods (Migration 5)
// "RATE_DISCOUNT"  — rate-based with discount applied
// "OVERRIDE"       — fixed price regardless of rate periods

codeString    String?  // unique per tenant, stored uppercase
discountType  String?  // "PERCENT" | "FIXED"
discountValue Int?     // percent (1-100) or cents
expiresAt     DateTime?
usageLimit    Int?
usageCount    Int      @default(0)
paymentMode   String?  // "ONLINE" | "PAYMENT_OFFLINE"
```

### Changes to BookingStatus enum
```prisma
// ADD to BookingStatus:
PENDING_PAYMENT
// Used when CODE_REQUIRED + PAYMENT_OFFLINE package is selected.
// Lanes held indefinitely (no expiry like HOLD).
// Staff confirms payment to transition to CONFIRMED.
// Customer cannot self-serve cancel.
// Excluded from no-show logic.
```

### PromoCode deprecation path
1. Add new fields to Package (this migration)
2. Build admin UI for CODE_REQUIRED packages
3. Migrate existing PromoCode records to CODE_REQUIRED packages
4. Update booking flow to check CODE_REQUIRED packages at /book/confirm
5. Mark PromoCode model deprecated in schema comment
6. Remove PromoCode in a follow-up cleanup migration (v3)

### contracts/PROMO_CODES_DEPRECATED.md
Documents the OLD PromoCode model — already marked DEPRECATED.
After Migration 4 is complete, update the header to ARCHIVED
and point to the CODE_REQUIRED section of BOOKING_DOMAIN.md Part 1.

Depends on: Migration 3
Blocks: nothing, but PromoCode cleanup should follow

---

## Migration 5 — PricingPeriod table
Status: PLANNED
Priority: Low — current flat-rate pricing works for MVP

### Why
Wireframe decision: admin-configurable time-based pricing periods.
Rate-based packages use: people × hours × period rate.
Priority stack: holiday > weekend > weekday.

### New model
```prisma
model PricingPeriod {
  id                   String   @id @default(cuid())
  tenantId             String
  name                 String   // "Weekend", "Holiday", "Default"
  ratePerPersonPerHour Int      // integer cents
  daysOfWeek           Int[]    // 0=Sun, 6=Sat — empty means all days
  startTime            String   // "HH:MM" — null means all day
  endTime              String   // "HH:MM"
  specificDates        DateTime[] // for holidays — overrides daysOfWeek
  priority             Int      @default(0)
  // 0 = default (fallback), higher = higher priority
  // venue must always have exactly one priority-0 period
  tenantId_priority unique @@unique([tenantId, priority])
}
```

### Changes to calculatePrice()
```typescript
// Update signature to:
interface PricingInput {
  package:       Package
  bowlerCount:   number
  startTime:     Date      // NEW — needed for period resolution
  durationMins:  number    // NEW — for rate-based calculation
  gamesPerBowler?: number
}

// Resolution logic:
// 1. Check specificDates (holiday) — highest priority wins on overlap
// 2. Check daysOfWeek (weekend = SAT or SUN) — second priority
// 3. Use default period (priority 0) — fallback
// Rate formula: bowlerCount × (durationMins/60) × period.ratePerPersonPerHour
```

### Admin UI required
- Settings > Pricing: period list with priority reordering
- Each period: name, rate, schedule (days + time range or specific dates)
- Validation: at least one default period must exist

Depends on: nothing (additive new table)
Blocks: nothing

---

## Migration 6 — bowlersPerLane tenant-configurable
Status: PLANNED
Priority: Low — current hardcoded 6 works for Royal Z

### Why
Wireframe decision: bowlersPerLane is tenant-configurable for SaaS
licensing. Royal Z uses 6, another venue might use 4 or 8.

### Changes required
1. Ensure Migration 1 has run (adds bowlersPerLane Int to Tenant)
2. Update getLaneCount() signature:
   ```typescript
   // Before:
   export function getLaneCount(bowlerCount: number): number
   // After:
   export function getLaneCount(bowlerCount: number, bowlersPerLane = 6): number
   ```
3. Everywhere getLaneCount() is called, pass tenant.bowlersPerLane
4. BookingContext: load tenant.bowlersPerLane, pass to getLaneCount()
5. Snapshot bowlersPerLane onto Booking at CONFIRMED time

### Important
Do not change getLaneCount() until Migration 1 is confirmed complete.
The default parameter (6) ensures backward compatibility during transition.
The .cursorrules lane count rule updates to:
"Use getLaneCount(bowlerCount, tenant.bowlersPerLane)"

Depends on: Migration 1
Blocks: SaaS licensing to venues with different lane capacities

---

## Migration 7 — ClaimToken table (for customer accounts)
Status: PLANNED
Priority: Medium — blocks customer dashboard

### Why
Wireframe decision: post-booking account creation flow.
Customer creates account from /book/success confirmation page.
ClaimToken links their new account to their existing booking.

### New model
```prisma
model ClaimToken {
  id         String   @id @default(cuid())
  bookingId  String   @unique
  tenantId   String
  email      String
  token      String   @unique @default(cuid())
  expiresAt  DateTime // 24 hours after booking confirmation
  claimedAt  DateTime?
  createdAt  DateTime @default(now())
}
```

### Lifecycle
1. Created by webhook handler when Booking is CONFIRMED
2. Token included in confirmation email as URL param
3. Customer taps "Create account" on /book/success
4. Server validates: token exists, not expired, not claimed
5. Account created, booking.userId backfilled
6. claimedAt set — token cannot be reused
7. After 24h expiry: account can still be created manually,
   but booking not auto-linked (customer contacts venue)

Depends on: nothing
Blocks: customer dashboard (/dashboard route; also requires Migration 1)

