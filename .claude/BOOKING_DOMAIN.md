# BOOKING_DOMAIN.md
# Booking domain rules, data model, and business logic

## Booking flow — 4 steps

### Step 1 — Party details
Fields: partyType (OPEN | BIRTHDAY | CORPORATE | COSMIC), bowlerCount (1–18)
- partyType pre-filters available packages in Step 3
- bowlerCount > 18: show "Call us for large groups" message, no online booking
- laneCount = Math.ceil(bowlerCount / 6)  ← computed, never user-entered

### Step 2 — Date and time
Fields: date, timeSlot
- Available slots come from GET /api/bookings/availability?date=&laneCount=
- A slot is HELD the moment the customer selects it (optimistic hold)
- Hold is neutral amber color — NOT confirmed (not green)
- Hold expires after [holdTimeoutMinutes] set in venue config
- Expired holds auto-cancel via cron or Stripe webhook

### Step 3 — Package selection
Fields: packageId
- Packages filtered by partyType from Step 1
- Each package has: gameIncluded (bool), shoesIncluded (bool)
- Price footer shows: base price ± shoe rental ± games based on flags
- Pricing computed in src/lib/pricing.ts — never hardcoded in UI

### Step 4 — Confirm + pay
Fields: customerName, customerEmail, customerPhone, stripePaymentMethod
- Summary card shows: date, time, lanes, bowlers, package, itemized total
- Stripe payment intent created server-side before page loads
- On success: booking status → CONFIRMED, confirmation email sent

---

## Database schema (Prisma)

### Tenant
```prisma
model Tenant {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  address         String
  phone           String
  timezone        String   @default("America/New_York")
  themeSlug       String   @default("default")
  holdTimeoutMins Int      @default(10) @map("hold_timeout_mins")
  maxOnlineBowlers Int     @default(18) @map("max_online_bowlers")
  config          Json     @default("{}")
  createdAt       DateTime @default(now()) @map("created_at")
  bookings        Booking[]
  packages        Package[]
  lanes           Lane[]
  users           User[]
  operatingHours  OperatingHours[]
  blockedSlots    BlockedSlot[]
}
```

### User
```prisma
model User {
  id        String   @id @default(cuid())
  tenantId  String?  @map("tenant_id")      // null = customer (no venue affiliation)
  email     String   @unique
  name      String?
  phone     String?
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now()) @map("created_at")
  bookings  Booking[]
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
}

enum Role {
  CUSTOMER
  STAFF
  MANAGER
  ADMIN
}
```

### Booking
```prisma
model Booking {
  id             String        @id @default(cuid())
  tenantId       String        @map("tenant_id")
  userId         String?       @map("user_id")       // null = guest
  confirmationCode String      @unique @map("confirmation_code")
  partyType      PartyType     @map("party_type")
  bowlerCount    Int           @map("bowler_count")
  laneCount      Int           @map("lane_count")    // ceil(bowlerCount/6)
  startTime      DateTime      @map("start_time")
  endTime        DateTime      @map("end_time")
  packageId      String        @map("package_id")
  status         BookingStatus @default(HOLD)
  source         BookingSource @default(ONLINE)
  customerName   String        @map("customer_name")
  customerEmail  String        @map("customer_email")
  customerPhone  String?       @map("customer_phone")
  totalAmount    Decimal       @db.Decimal(10,2) @map("total_amount")
  notes          String?
  isRefunded     Boolean       @default(false) @map("is_refunded")
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")
  tenant         Tenant        @relation(fields: [tenantId], references: [id])
  user           User?         @relation(fields: [userId], references: [id])
  package        Package       @relation(fields: [packageId], references: [id])
  lanes          BookingLane[]
  payment        Payment?
  auditLogs      AuditLog[]
}

enum BookingStatus {
  HOLD
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

enum BookingSource {
  ONLINE
  WALK_IN
  PHONE
}

enum PartyType {
  OPEN
  BIRTHDAY
  CORPORATE
  COSMIC
}
```

### Package
```prisma
model Package {
  id             String   @id @default(cuid())
  tenantId       String   @map("tenant_id")
  name           String
  description    String?
  basePrice      Decimal  @db.Decimal(10,2) @map("base_price")
  gameIncluded   Boolean  @default(false) @map("game_included")
  shoesIncluded  Boolean  @default(false) @map("shoes_included")
  gameCostPer    Decimal? @db.Decimal(10,2) @map("game_cost_per")    // if not included
  shoeCostPer    Decimal? @db.Decimal(10,2) @map("shoe_cost_per")    // if not included
  partyTypes     PartyType[]  // which party types can select this package
  active         Boolean  @default(true)
  sortOrder      Int      @default(0) @map("sort_order")
  tenant         Tenant   @relation(fields: [tenantId], references: [id])
  bookings       Booking[]
}
```

### Payment
```prisma
model Payment {
  id                    String    @id @default(cuid())
  bookingId             String    @unique @map("booking_id")
  stripePaymentIntentId String?   @map("stripe_payment_intent_id")
  amount                Decimal   @db.Decimal(10,2)
  status                String    // pending | succeeded | failed | refunded
  stripeRefundId        String?   @map("stripe_refund_id")
  refundAmount          Decimal?  @db.Decimal(10,2) @map("refund_amount")
  refundStatus          String?   @map("refund_status")   // pending | succeeded | failed
  refundReason          String?   @map("refund_reason")
  refundedAt            DateTime? @map("refunded_at")
  refundedBy            String?   @map("refunded_by")     // userId of staff
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  booking               Booking   @relation(fields: [bookingId], references: [id], onDelete: Cascade)
}
```

### Supporting models
```prisma
model Lane {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  number    Int
  active    Boolean  @default(true)
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  bookings  BookingLane[]
}

model BookingLane {
  bookingId String  @map("booking_id")
  laneId    String  @map("lane_id")
  booking   Booking @relation(fields: [bookingId], references: [id])
  lane      Lane    @relation(fields: [laneId], references: [id])
  @@id([bookingId, laneId])
}

model BlockedSlot {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  startTime DateTime @map("start_time")
  endTime   DateTime @map("end_time")
  reason    String?
  lanes     Int[]    // lane numbers blocked; empty = all lanes
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
}

model AuditLog {
  id         String   @id @default(cuid())
  bookingId  String?  @map("booking_id")
  userId     String?  @map("user_id")
  action     String   // CANCEL | REFUND | MODIFY | CHECK_IN | CREATE
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  details    Json?
  createdAt  DateTime @default(now()) @map("created_at")
  booking    Booking? @relation(fields: [bookingId], references: [id])
}

enum CancellationReason {
  CUSTOMER_REQUEST
  NO_SHOW
  VENUE_ISSUE
  SYSTEM_EXPIRED
}
```

---

## Pricing logic (src/lib/pricing.ts)

```typescript
interface PricingInput {
  package: Package
  bowlerCount: number
  gamesPerBowler?: number   // default from venue config
  shoesPerBowler?: number   // default = bowlerCount
}

interface PricingResult {
  baseAmount:  number
  gameAmount:  number   // 0 if gameIncluded
  shoeAmount:  number   // 0 if shoesIncluded
  totalAmount: number
  lineItems:   LineItem[]
}

function calculatePrice(input: PricingInput): PricingResult
```

---

## Refund rules

Show refund option when ALL true:
- booking has a Payment record
- payment.status = 'succeeded'
- payment.stripeRefundId IS NULL (not already refunded)
- booking.status != 'CANCELLED'
- current user role = MANAGER or ADMIN

Walk-in and phone bookings (source = WALK_IN | PHONE):
- No Stripe payment — cancel only, no refund toggle
- Staff may note manual cash refund in notes field

Refund endpoint: POST /api/staff/bookings/[id]/refund
Required role: MANAGER | ADMIN
Always creates AuditLog entry with action: 'REFUND'

---

## Availability logic

GET /api/bookings/availability?tenantId=&date=&laneCount=
Returns array of available time slots.

A slot is UNAVAILABLE if:
- Any of the required laneCount lanes are booked for that time
- A BlockedSlot covers that time for those lanes
- Outside operating hours for that day/venue

---

## API routes structure

/api/bookings/availability   GET  — public, returns open slots
/api/bookings                POST — create booking (hold)
/api/bookings/[id]/confirm   POST — confirm after payment
/api/bookings/[id]/cancel    POST — customer cancel (with token)
/api/staff/bookings          GET  — list with filters (role: STAFF+)
/api/staff/bookings/[id]     GET  — booking detail
/api/staff/bookings/[id]/refund  POST — issue refund (role: MANAGER+)
/api/staff/bookings/[id]/checkin POST — check in bowlers
/api/admin/packages          GET POST PATCH DELETE (role: ADMIN)
/api/admin/settings          GET PATCH (role: ADMIN)
/api/webhooks/stripe         POST — Stripe webhook handler
