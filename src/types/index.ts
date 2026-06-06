// ============================================================
// types/index.ts — Shared TypeScript types
// ============================================================

// ── Enums ──────────────────────────────────────────────────

export type Role = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN'

export type BookingStatus =
  | 'HOLD'
  | 'CONFIRMED'
  | 'PENDING_PAYMENT'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'

export type BookingSource = 'ONLINE' | 'WALK_IN' | 'PHONE'

export type PartyType = 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'

export type CancellationReason =
  | 'CUSTOMER_REQUEST'
  | 'NO_SHOW'
  | 'VENUE_ISSUE'
  | 'SYSTEM_EXPIRED'

// ── Tenant ─────────────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  timezone: string
  themeSlug: string
  holdTimeoutMins: number
  maxOnlineBowlers: number
  cancellationWindowHours: number
  rescheduleWindowHours: number
  checkInWindowMinutes: number
  bowlersPerLane: number
  cancellationRefundPercent: number
  config: Record<string, unknown>
}

// ── User ───────────────────────────────────────────────────

export interface User {
  id: string
  tenantId: string | null
  email: string
  name: string | null
  phone: string | null
  role: Role
}

// ── Package ────────────────────────────────────────────────

export interface Package {
  id: string
  tenantId: string
  name: string
  description: string | null
  /** Integer cents (e.g. 4500 = $45.00). */
  basePrice: number
  gameIncluded: boolean
  shoesIncluded: boolean
  /** Integer cents per game when not included (e.g. 800 = $8.00). */
  gameCostPer: number | null
  /** Integer cents per pair when not included (e.g. 500 = $5.00). */
  shoeCostPer: number | null
  partyTypes: PartyType[]
  accessType?: 'PUBLIC' | 'CODE_REQUIRED'
  paymentMode?: 'ONLINE' | 'PAYMENT_OFFLINE' | null
  codeString?: string | null
  active: boolean
  sortOrder: number
}

// ── Booking ────────────────────────────────────────────────

export interface Booking {
  id: string
  tenantId: string
  userId: string | null
  confirmationCode: string
  partyType: PartyType
  bowlerCount: number
  laneCount: number
  startTime: Date
  endTime: Date
  packageId: string
  status: BookingStatus
  source: BookingSource
  customerName: string
  customerEmail: string
  customerPhone: string | null
  /** Integer cents (e.g. 4500 = $45.00). */
  totalAmount: number
  notes: string | null
  isRefunded: boolean
  createdAt: Date
  updatedAt: Date
  package?: Package
  payment?: Payment
}

// ── Payment ────────────────────────────────────────────────

export interface Payment {
  id: string
  bookingId: string
  stripePaymentIntentId: string | null
  /** Integer cents (e.g. 4500 = $45.00). */
  amount: number
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  stripeRefundId: string | null
  /** Integer cents refunded (e.g. 4500 = $45.00). */
  refundAmount: number | null
  refundStatus: 'pending' | 'succeeded' | 'failed' | null
  refundReason: string | null
  refundedAt: Date | null
  refundedBy: string | null
}

/** Resolved promo preview for the booking flow (matches validatePromoCode). */
export interface PromoValidationResult {
  code: string
  description: string | null
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  discountCents: number
}

export interface ShoeSelection {
  bowlerId: string
  size: string
  /** Integer cents for this bowler's shoes (0 for own shoes). */
  cost: number
}

export interface BookingSession {
  // Step 1
  partyType: PartyType | null
  bowlerCount: number | null
  laneCount: number | null   // computed, not user-entered

  // Step 2
  date: string | null        // ISO date string YYYY-MM-DD
  timeSlotId: string | null
  startTime: Date | null
  endTime: Date | null
  /** Server-side BookingHold row id. Null before step 2 hold is acquired. */
  holdId: string | null
  holdExpiresAt: Date | null

  // Step 3
  packageId: string | null
  selectedPackage: Package | null
  /** Integer cents (e.g. 4500 = $45.00). */
  totalAmount: number | null

  // Step 4
  customerName: string
  customerEmail: string
  customerPhone: string
  /** Stripe PaymentIntent client_secret returned by confirmBooking(). */
  stripeClientSecret: string | null
  /** Stripe PaymentIntent id. Kept for client-side confirm + retry. */
  stripePaymentIntentId: string | null
  /** Applied promo preview; null until validated via applyPromoCode. */
  promoCode: PromoValidationResult | null

  // Step 3 — shoe sizing
  shoeSelections: ShoeSelection[]

  /** Step 2 — optional package add-on ids (pre-Migration 3 catalog). */
  selectedOptionalAddonIds: string[]

  /** CODE_REQUIRED package access code validated at package or confirm step. */
  packageAccessCode: string | null
}

// ── Availability ───────────────────────────────────────────

export interface TimeSlot {
  id: string
  startTime: Date
  endTime: Date
  available: boolean
  laneNumbers: number[]
  /** Unreserved lanes for this interval (see `.claude/BOOKING_DOMAIN.md` — Availability logic). */
  lanesFree: number
  /** `floor(lanesFree / laneCount)` for this request; 0 when the slot is full. */
  spotsRemaining: number
}

// ── Pricing ────────────────────────────────────────────────

export interface LineItem {
  label: string
  /** Integer cents (e.g. 4500 = $45.00). */
  amount: number
  type: 'base' | 'game' | 'shoe' | 'discount' | 'fee' | 'addon'
}

export interface PricingResult {
  /** Integer cents (e.g. 4500 = $45.00). */
  baseAmount: number
  /** Integer cents (e.g. 4500 = $45.00). */
  gameAmount: number
  /** Integer cents (e.g. 4500 = $45.00). */
  shoeAmount: number
  /** Integer cents (e.g. 4500 = $45.00). */
  totalAmount: number
  lineItems: LineItem[]
}
