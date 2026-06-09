'use server'

// booking.ts — Server actions for the customer booking flow.
//
// Phase 7 architecture:
//   - Holds live in a separate BookingHold table. Acquiring a hold creates
//     a row that excludes its time range from availability until either
//     `expiresAt` passes or `releaseBookingHold` is called.
//   - Availability queries lazily delete expired holds before computing
//     availability — no cron needed.
//   - `confirmBooking` creates a Stripe PaymentIntent and stores enough
//     metadata for the webhook to construct the final Booking row. The
//     client confirms the card via Stripe Elements; the webhook
//     (src/app/api/webhooks/stripe/route.ts) is the SOLE place that
//     transitions a hold to a Booking. This guarantees that we never
//     persist a "confirmed" booking that wasn't actually paid for.
//
// Dev-without-DB fallback continues to work for design exploration:
//   - getAvailableDates / getAvailableTimeSlots / getPackagesForTenant
//     return deterministic mocks
//   - acquireBookingHold returns an in-memory hold descriptor
//   - confirmBooking returns a mock clientSecret with a fake booking id
//
// All monetary amounts in args/returns are integer cents.

import { validatePromoCode } from '@/lib/actions/promo'
import { generateConfirmationCode } from '@/lib/booking-codes'
import { policySnapshotFromTenantRow } from '@/lib/booking-snapshots'
import { serializeShoeSelections } from '@/lib/booking-metadata'
import { assignBookingLanes } from '@/lib/lane-assignment'
import { isUniqueConstraintOnField } from '@/lib/prisma-errors'
import { isDevWithoutDb, shouldUseDevDbFallback, warnOnce } from '@/lib/env'
import { getLaneCount, CAPACITY_BOOKING_STATUSES } from '@/lib/lane-logic'
import {
  findOverlappingBlockedSlots,
  sumReservedLanesIncludingBlocks,
} from '@/lib/blocked-lanes'
import { calculateBookingTotal, type BookingPricingContext } from '@/lib/pricing'
import { prisma } from '@/lib/prisma'
import { createPaymentIntent, isStripeMocked } from '@/lib/stripe'
import {
  assertBookingDurationWithinLimits,
  getBookingDurationLimits,
  getLaneReservationCentsPerLane,
  getShoeRentalPriceCents,
} from '@/lib/tenant-config'
import { isLaneOnlyDefaultPackage } from '@/lib/package-detail'
import { getTenant } from '@/lib/tenant'
import {
  buildLanePricingContext,
  resolveStrategyForBooking,
} from '@/lib/tenant-pricing'
import { Prisma } from '@prisma/client'
import type { PricingPeriod } from '@prisma/client'
import QRCode from 'qrcode'
import type { Package, PartyType, ShoeSelection, Tenant, TimeSlot } from '@/types'

const HOLD_TIMEOUT_MINS_DEFAULT = 10
const HOLD_TRANSACTION_MAX_ATTEMPTS = 3

import { loadPricingPeriodsForTenant } from '@/lib/pricing-periods-data'

function lanePricingContextForHold(
  tenant: Awaited<ReturnType<typeof getTenant>>,
  periods: PricingPeriod[],
  bowlerCount: number,
  laneCount: number,
  startTime: Date,
  endTime: Date,
): BookingPricingContext | undefined {
  return buildLanePricingContext({
    strategy: resolveStrategyForBooking(tenant),
    periods,
    defaultRateCentsPerLane: getLaneReservationCentsPerLane(tenant),
    bowlerCount,
    laneCount,
    startTime,
    endTime,
  })
}

async function resolveBowlersPerLane(tenantId: string): Promise<number> {
  if (isDevWithoutDb()) {
    return (await getTenant()).bowlersPerLane
  }
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { bowlersPerLane: true },
  })
  return row?.bowlersPerLane ?? 6
}

// ── Date strip ────────────────────────────────────────────

export interface AvailableDate {
  date: string
  weekday: string
  day: number
  available: boolean
}

const DATE_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
})

export async function getAvailableDates(
  tenantId: string,
  days: number = 7,
  bowlerCount: number,
): Promise<AvailableDate[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const out: AvailableDate[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateISO = toISODate(d)
    const slots = await getAvailableTimeSlots(tenantId, dateISO, bowlerCount)
    const hasSlots = slots.some((slot) => slot.available)
    out.push({
      date: dateISO,
      weekday: DATE_WEEKDAY_FORMATTER.format(d),
      day: d.getDate(),
      available: hasSlots,
    })
  }
  return out
}

/** One server call per visible month — never loop from the client. */
export async function getAvailableDatesForMonth(
  tenantId: string,
  year: number,
  month: number,
  bowlerCount: number,
): Promise<AvailableDate[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const lastDay = new Date(year, month + 1, 0).getDate()
  const out: AvailableDate[] = []

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day)
    const dateISO = toISODate(d)
    const isPast = d.getTime() < today.getTime()

    let available = false
    if (!isPast) {
      const slots = await getAvailableTimeSlots(
        tenantId,
        dateISO,
        bowlerCount,
      )
      available = slots.some((slot) => slot.available)
    }

    out.push({
      date: dateISO,
      weekday: DATE_WEEKDAY_FORMATTER.format(d),
      day,
      available: !isPast && available,
    })
  }

  return out
}

// ── Time slots ────────────────────────────────────────────

/** Mock tenant lane count for dev-without-DB availability demos (BOOKING_DOMAIN). */
const MOCK_TOTAL_LANES_DEV = 8

function mockReservedLanesForHour(hour: number): number {
  switch (hour) {
    case 16:
      return 8
    case 17:
      return 7
    case 18:
      return 6
    case 19:
      return 4
    case 20:
      return 2
    case 21:
      return 1
    default:
      return 0
  }
}

function enrichTimeSlotAvailability(
  slot: TimeSlot,
  laneCount: number,
  totalLanes: number,
  reservedLanes: number,
): TimeSlot {
  const freeLanes = Math.max(0, totalLanes - reservedLanes)
  const available = totalLanes > 0 && freeLanes >= laneCount
  const spotsRemaining = available ? Math.floor(freeLanes / laneCount) : 0
  return {
    ...slot,
    available,
    lanesFree: freeLanes,
    spotsRemaining,
  }
}

async function resolveSlotDurationHours(tenantId: string): Promise<number> {
  if (isDevWithoutDb()) {
    const tenant = await getTenant()
    return getBookingDurationLimits(tenant).minHours
  }
  const row = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { config: true },
  })
  const config =
    row?.config && typeof row.config === 'object' && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {}
  return getBookingDurationLimits({ config } as Tenant).minHours
}

function slotIdForStart(dateISO: string, start: Date): string {
  if (start.getMinutes() === 0 && start.getSeconds() === 0) {
    return `${dateISO}-${start.getHours()}`
  }
  return `${dateISO}-${start.getHours()}-${start.getMinutes()}`
}

export async function getAvailableTimeSlots(
  tenantId: string,
  dateISO: string,
  bowlerCount: number,
): Promise<TimeSlot[]> {
  if (!isDevWithoutDb()) {
    await cleanupExpiredHolds(tenantId)
  }
  const bowlersPerLane = await resolveBowlersPerLane(tenantId)
  const laneCount = getLaneCount(bowlerCount, bowlersPerLane)
  const slotDurationHours = await resolveSlotDurationHours(tenantId)
  const slots = buildMockSlotsFor(dateISO, slotDurationHours)

  if (isDevWithoutDb()) {
    return slots.map((slot) => {
      const hour = slot.startTime.getHours()
      const reserved = mockReservedLanesForHour(hour)
      return enrichTimeSlotAvailability(
        slot,
        laneCount,
        MOCK_TOTAL_LANES_DEV,
        reserved,
      )
    })
  }

  const totalLanes = await prisma.lane.count({
    where: { tenantId, active: true },
  })
  const dayStart = slots[0]?.startTime
  const dayEnd = slots[slots.length - 1]?.endTime
  if (dayStart == null || dayEnd == null) return slots

  const [confirmed, held, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: [...CAPACITY_BOOKING_STATUSES] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true, laneCount: true },
    }),
    prisma.bookingHold.findMany({
      where: {
        tenantId,
        expiresAt: { gt: new Date() },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true, laneCount: true },
    }),
    prisma.blockedSlot.findMany({
      where: {
        tenantId,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true, lanes: true },
    }),
  ])

  return slots.map((slot) => {
    const reserved = sumReservedLanesIncludingBlocks(
      [...confirmed, ...held],
      blocks,
      slot.startTime,
      slot.endTime,
      totalLanes,
    )
    return enrichTimeSlotAvailability(slot, laneCount, totalLanes, reserved)
  })
}

function buildMockSlotsFor(
  dateISO: string,
  slotDurationHours: number,
): TimeSlot[] {
  const base = new Date(`${dateISO}T00:00:00`)
  const out: TimeSlot[] = []
  const stepMs = slotDurationHours * 60 * 60 * 1000
  const dayOpen = new Date(base)
  dayOpen.setHours(16, 0, 0, 0)
  const dayClose = new Date(base)
  dayClose.setHours(24, 0, 0, 0)

  for (
    let startMs = dayOpen.getTime();
    startMs + stepMs <= dayClose.getTime();
    startMs += stepMs
  ) {
    const start = new Date(startMs)
    const end = new Date(startMs + stepMs)
    out.push({
      id: slotIdForStart(dateISO, start),
      startTime: start,
      endTime: end,
      available: true,
      laneNumbers: [],
      lanesFree: 0,
      spotsRemaining: 0,
    })
  }
  return out
}

async function cleanupExpiredHolds(tenantId: string): Promise<void> {
  await prisma.bookingHold.deleteMany({
    where: { tenantId, expiresAt: { lt: new Date() } },
  })
}

// ── Hold lifecycle ────────────────────────────────────────

export interface AcquireHoldInput {
  tenantId: string
  startTime: Date
  endTime: Date
  bowlerCount: number
}

export interface AcquireHoldResult {
  holdId: string
  expiresAt: Date
}

export async function acquireBookingHold(
  input: AcquireHoldInput,
): Promise<AcquireHoldResult> {
  const bowlersPerLane = await resolveBowlersPerLane(input.tenantId)
  const laneCount = getLaneCount(input.bowlerCount, bowlersPerLane)
  if (laneCount < 1) {
    throw new Error('Bowler count must be at least 1.')
  }
  if (
    !(input.startTime instanceof Date) ||
    !(input.endTime instanceof Date) ||
    Number.isNaN(input.startTime.getTime()) ||
    Number.isNaN(input.endTime.getTime()) ||
    input.startTime >= input.endTime
  ) {
    throw new Error('Invalid booking time slot.')
  }

  const tenant = await getTenant()
  if (!isDevWithoutDb() && tenant.id !== input.tenantId) {
    throw new Error('Tenant not found')
  }
  assertBookingDurationWithinLimits(tenant, input.startTime, input.endTime)

  if (isDevWithoutDb()) {
    const expiresAt = new Date(Date.now() + HOLD_TIMEOUT_MINS_DEFAULT * 60_000)
    return { holdId: `hold_mock_${Date.now()}`, expiresAt }
  }

  const hold = await withSerializableRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const now = new Date()
        const tenant = await tx.tenant.findUnique({
          where: { id: input.tenantId },
          select: {
            holdTimeoutMins: true,
            maxOnlineBowlers: true,
            bowlersPerLane: true,
            config: true,
          },
        })
        if (!tenant) throw new Error('Tenant not found')
        if (input.bowlerCount > tenant.maxOnlineBowlers) {
          throw new Error('Group size exceeds online booking limit.')
        }

        await tx.bookingHold.deleteMany({
          where: { tenantId: input.tenantId, expiresAt: { lt: now } },
        })

        const totalLanes = await tx.lane.count({
          where: { tenantId: input.tenantId, active: true },
        })
        const confirmedBookings = await tx.booking.findMany({
          where: {
            tenantId: input.tenantId,
            status: { in: [...CAPACITY_BOOKING_STATUSES] },
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
          },
          select: { startTime: true, endTime: true, laneCount: true },
        })
        const activeHolds = await tx.bookingHold.findMany({
          where: {
            tenantId: input.tenantId,
            expiresAt: { gt: now },
            startTime: { lt: input.endTime },
            endTime: { gt: input.startTime },
          },
          select: { startTime: true, endTime: true, laneCount: true },
        })
        const blocks = await findOverlappingBlockedSlots(
          tx,
          input.tenantId,
          input.startTime,
          input.endTime,
        )

        const reservedLanes = sumReservedLanesIncludingBlocks(
          [...confirmedBookings, ...activeHolds],
          blocks,
          input.startTime,
          input.endTime,
          totalLanes,
        )
        if (totalLanes - reservedLanes < laneCount) {
          throw new Error('Selected time slot is no longer available.')
        }

        const holdMins = tenant.holdTimeoutMins ?? HOLD_TIMEOUT_MINS_DEFAULT
        const expiresAt = new Date(now.getTime() + holdMins * 60_000)
        return tx.bookingHold.create({
          data: {
            tenantId: input.tenantId,
            startTime: input.startTime,
            endTime: input.endTime,
            bowlerCount: input.bowlerCount,
            laneCount,
            expiresAt,
          },
          select: { id: true, expiresAt: true },
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  )
  return { holdId: hold.id, expiresAt: hold.expiresAt }
}

export async function releaseBookingHold(holdId: string): Promise<void> {
  if (
    isDevWithoutDb() ||
    holdId.trim().length === 0 ||
    holdId.startsWith('hold_mock_')
  ) {
    return
  }
  await prisma.bookingHold.deleteMany({ where: { id: holdId } })
}

// ── Packages ──────────────────────────────────────────────

export async function validatePackageAccessCode(
  tenantId: string,
  code: string,
): Promise<{ packageId: string; name: string } | null> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  if (isDevWithoutDb()) {
    if (normalized === 'VIP2026') {
      return { packageId: 'pkg-vip', name: 'VIP Lane' }
    }
    return null
  }
  const rows = await prisma.package.findMany({
    where: {
      tenantId,
      active: true,
      accessType: 'CODE_REQUIRED',
    },
    select: { id: true, name: true, codeString: true },
  })
  const row = rows.find(
    (pkg) => pkg.codeString?.trim().toUpperCase() === normalized,
  )
  return row ? { packageId: row.id, name: row.name } : null
}

async function assertPackageAccessForCheckout(
  tenantId: string,
  pkg: { id: string; accessType?: string | null },
  accessCode: string | null | undefined,
): Promise<void> {
  if (pkg.accessType !== 'CODE_REQUIRED') return
  if (!accessCode?.trim()) {
    throw new Error('This package requires a special access code.')
  }
  const unlocked = await validatePackageAccessCode(tenantId, accessCode)
  if (!unlocked || unlocked.packageId !== pkg.id) {
    throw new Error('Invalid access code for this package.')
  }
}

export async function getPackagesForTenant(tenantId: string): Promise<Package[]> {
  if (shouldUseDevDbFallback()) {
    return mockPackages(tenantId)
  }
  try {
    const rows = await prisma.package.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        basePrice: true,
        gameIncluded: true,
        shoesIncluded: true,
        gameCostPer: true,
        shoeCostPer: true,
        partyTypes: true,
        accessType: true,
        paymentMode: true,
        active: true,
        sortOrder: true,
      },
    })
    return rows.map((pkg) => ({ ...pkg, codeString: null } as Package)).filter(
      (pkg) => !isLaneOnlyDefaultPackage(pkg),
    )
  } catch (err) {
    if (shouldUseDevDbFallback(err)) {
      warnOnce(
        'packages-db',
        'Database unreachable — returning mock packages for dev.',
      )
      return mockPackages(tenantId)
    }
    throw err
  }
}

function mockPackages(tenantId: string): Package[] {
  const packages: Package[] = [
    {
      id: 'pkg-classic',
      tenantId,
      name: 'Classic Bowling',
      description: 'Two games per bowler. Shoes included.',
      basePrice: 3600,
      gameIncluded: true,
      shoesIncluded: true,
      gameCostPer: null,
      shoeCostPer: null,
      partyTypes: ['OPEN'] satisfies PartyType[],
      active: true,
      sortOrder: 1,
    },
    {
      id: 'pkg-pay-per-game',
      tenantId,
      name: 'Pay-Per-Game',
      description: 'Just lane time. Pay per game, shoes extra.',
      basePrice: 1200,
      gameIncluded: false,
      shoesIncluded: false,
      gameCostPer: 800,
      shoeCostPer: 500,
      partyTypes: ['OPEN'] satisfies PartyType[],
      active: true,
      sortOrder: 2,
    },
    {
      id: 'pkg-birthday',
      tenantId,
      name: 'Birthday Party',
      description:
        'Everything you need for a great birthday. Includes shoes, food, reserved table, and a pitcher of your choice.',
      basePrice: 18500,
      gameIncluded: true,
      shoesIncluded: true,
      gameCostPer: null,
      shoeCostPer: null,
      partyTypes: ['BIRTHDAY'] satisfies PartyType[],
      active: true,
      sortOrder: 3,
    },
    {
      id: 'pkg-vip',
      tenantId,
      name: 'VIP Lane',
      description: 'Private lane package — code required.',
      basePrice: 12000,
      gameIncluded: true,
      shoesIncluded: true,
      gameCostPer: null,
      shoeCostPer: null,
      partyTypes: ['OPEN'] satisfies PartyType[],
      accessType: 'CODE_REQUIRED',
      paymentMode: 'PAYMENT_OFFLINE',
      active: true,
      sortOrder: 4,
    },
  ]
  return packages.filter((pkg) => !isLaneOnlyDefaultPackage(pkg))
}

async function findLaneOnlyDefaultPackage(
  tenantId: string,
): Promise<Package | null> {
  const rows = await prisma.package.findMany({
    where: {
      tenantId,
      active: true,
      basePrice: 0,
      gameIncluded: false,
      shoesIncluded: false,
      partyTypes: { has: 'OPEN' },
    },
    orderBy: { sortOrder: 'asc' },
  })
  return (rows as unknown as Package[]).find(isLaneOnlyDefaultPackage) ?? null
}

// ── Confirm: create PaymentIntent, return clientSecret ────

export interface ConfirmBookingInput {
  tenantId: string
  holdId: string
  packageId?: string | null
  partyType: 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'
  bowlerCount: number
  laneCount: number
  startTime: Date
  endTime: Date
  /** Booking subtotal in cents (before promo). */
  totalAmount: number
  promoCode?: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  shoeSelections?: ShoeSelection[]
  shoeRentalPriceCents?: number
  laneReservationCentsPerLane?: number
  selectedOptionalAddonIds?: string[]
  smsReminderConsent?: boolean
  marketingConsent?: boolean
  /** Required when package accessType is CODE_REQUIRED. */
  packageAccessCode?: string | null
}

export interface ConfirmBookingResult {
  clientSecret?: string
  paymentIntentId?: string
  confirmationCode?: string
  bookingId?: string
  /** CODE_REQUIRED + PAYMENT_OFFLINE — no Stripe; booking is PENDING_PAYMENT. */
  offlinePending?: boolean
  mocked: boolean
}

function assertCompleteShoeSelections(
  bowlerCount: number,
  shoeSelections: ShoeSelection[],
  shoesRequired: boolean,
): void {
  if (!shoesRequired) return
  if (
    shoeSelections.length !== bowlerCount ||
    !shoeSelections.every((row) => row.size.length > 0)
  ) {
    throw new Error('Shoe size required for each bowler.')
  }
}

/**
 * Step 4 entry point: create the Stripe PaymentIntent and return its
 * client_secret so the browser can confirm the card. The actual Booking row
 * is created by the Stripe webhook on `payment_intent.succeeded` — never
 * by this action — so a "confirmed" booking always implies a captured
 * payment.
 *
 * The PaymentIntent metadata carries every field the webhook needs to
 * reconstruct the Booking row. Don't trust the client to re-send these on
 * success; we read them from the intent itself.
 */
export async function confirmBooking(
  input: ConfirmBookingInput,
): Promise<ConfirmBookingResult> {
  if (input.totalAmount <= 0) {
    throw new Error('confirmBooking: totalAmount must be positive')
  }

  let tenantId = input.tenantId
  let packageId = input.packageId ?? null
  let partyType = input.partyType
  let bowlerCount = input.bowlerCount
  let laneCount = input.laneCount
  let startTime = input.startTime
  let endTime = input.endTime
  let subtotalCents = input.totalAmount
  let selectedPackage: Package | null = null

  const tenantForPricing = await getTenant()
  const shoeRentalPriceCents = getShoeRentalPriceCents(tenantForPricing)
  const laneReservationCentsPerLane =
    getLaneReservationCentsPerLane(tenantForPricing)
  const shoeSelections = input.shoeSelections ?? []
  const selectedOptionalAddonIds = input.selectedOptionalAddonIds ?? []
  const pricingPeriods = await loadPricingPeriodsForTenant(tenantId)

  if (!isDevWithoutDb()) {
    const hold = await prisma.bookingHold.findUnique({
      where: { id: input.holdId },
    })
    if (!hold || hold.expiresAt <= new Date()) {
      throw new Error('Hold expired or not found — pick a new time slot.')
    }
    if (hold.tenantId !== input.tenantId) {
      throw new Error('Booking hold does not match this venue.')
    }
    if (
      hold.bowlerCount !== input.bowlerCount ||
      hold.startTime.getTime() !== input.startTime.getTime() ||
      hold.endTime.getTime() !== input.endTime.getTime()
    ) {
      throw new Error('Booking hold no longer matches selected slot.')
    }

    tenantId = hold.tenantId
    bowlerCount = hold.bowlerCount
    laneCount = hold.laneCount
    startTime = hold.startTime
    endTime = hold.endTime

    if (packageId != null) {
      const pkgRow = await prisma.package.findFirst({
        where: { id: packageId, tenantId: hold.tenantId, active: true },
      })
      if (!pkgRow) {
        throw new Error('Selected package is no longer available.')
      }
      selectedPackage = pkgRow as unknown as Package
      await assertPackageAccessForCheckout(
        hold.tenantId,
        selectedPackage,
        input.packageAccessCode,
      )
      if (!selectedPackage.partyTypes.includes(input.partyType)) {
        throw new Error('Selected package is not available for this party type.')
      }
      partyType = input.partyType
    } else {
      const fallback = await findLaneOnlyDefaultPackage(hold.tenantId)
      if (!fallback) {
        throw new Error('Venue has no lane-only package configured for booking.')
      }
      packageId = fallback.id
      partyType = 'OPEN'
      selectedPackage = null
    }

    assertCompleteShoeSelections(
      bowlerCount,
      shoeSelections,
      selectedPackage != null ? !selectedPackage.shoesIncluded : true,
    )

    subtotalCents = calculateBookingTotal({
      package: selectedPackage,
      bowlerCount,
      laneCount,
      shoeSelections,
      shoeRentalPriceCents,
      laneReservationCents: selectedPackage
        ? 0
        : laneReservationCentsPerLane * laneCount,
      selectedOptionalAddonIds,
      pricingContext: selectedPackage
        ? undefined
        : lanePricingContextForHold(
            tenantForPricing,
            pricingPeriods,
            bowlerCount,
            laneCount,
            startTime,
            endTime,
          ),
    }).totalAmount

    if (input.totalAmount !== subtotalCents) {
      throw new Error('Booking total changed — review your booking.')
    }
  } else if (packageId == null) {
    packageId = 'pkg-classic'
    partyType = 'OPEN'
    subtotalCents = calculateBookingTotal({
      package: null,
      bowlerCount,
      laneCount,
      shoeSelections,
      shoeRentalPriceCents,
      laneReservationCents: laneReservationCentsPerLane * laneCount,
      selectedOptionalAddonIds,
      pricingContext: lanePricingContextForHold(
        tenantForPricing,
        pricingPeriods,
        bowlerCount,
        laneCount,
        startTime,
        endTime,
      ),
    }).totalAmount
  }

  let discountCents = 0
  let promoCodeNormalized: string | null = null
  const rawPromo = input.promoCode?.trim()
  if (rawPromo) {
    const validated = await validatePromoCode(
      tenantId,
      rawPromo,
      subtotalCents,
    )
    discountCents = validated.discountCents
    promoCodeNormalized = validated.code
  }

  const chargeCents = subtotalCents - discountCents
  if (chargeCents <= 0) {
    throw new Error('Booking total after discount must be greater than zero.')
  }

  const tenantRow = await getTenant()
  const bowlersPerLane = tenantRow.bowlersPerLane

  const metadata: Record<string, string> = {
    holdId: input.holdId,
    tenantId,
    packageId,
    partyType,
    bowlerCount: String(bowlerCount),
    laneCount: String(laneCount),
    bowlersPerLane: String(bowlersPerLane),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    subtotalCents: String(subtotalCents),
    smsReminderConsent: input.smsReminderConsent ? 'true' : 'false',
    marketingConsent: input.marketingConsent ? 'true' : 'false',
  }
  if (shoeSelections.length > 0) {
    metadata.shoeSelections = serializeShoeSelections(shoeSelections)
  }
  if (promoCodeNormalized != null && discountCents > 0) {
    metadata.promoCode = promoCodeNormalized
    metadata.discountCents = String(discountCents)
  }
  if (selectedOptionalAddonIds.length > 0) {
    metadata.optionalAddonIds = selectedOptionalAddonIds.join(',')
  }

  const intent = await createPaymentIntent({
    amountCents: chargeCents,
    customerEmail: input.customerEmail,
    description: `Booking for ${bowlerCount} bowlers`,
    metadata,
    idempotencyKey: `booking-hold:${input.holdId}`,
  })

  return {
    clientSecret: intent.clientSecret,
    paymentIntentId: intent.id,
    mocked: intent.mocked || isStripeMocked(),
  }
}

const OFFLINE_CODE_MAX_RETRIES = 5

/** CODE_REQUIRED packages with PAYMENT_OFFLINE — no Stripe PaymentIntent. */
export async function confirmOfflineBooking(
  input: ConfirmBookingInput,
): Promise<ConfirmBookingResult> {
  if (!input.packageId) {
    throw new Error('Offline booking requires a package.')
  }

  const tenantForPricing = await getTenant()

  if (isDevWithoutDb()) {
    return {
      confirmationCode: 'MOCK-OFF',
      bookingId: 'bk_offline_mock',
      offlinePending: true,
      mocked: true,
    }
  }

  const hold = await prisma.bookingHold.findUnique({
    where: { id: input.holdId },
  })
  if (!hold || hold.expiresAt <= new Date()) {
    throw new Error('Hold expired or not found — pick a new time slot.')
  }

  const pkgRow = await prisma.package.findFirst({
    where: {
      id: input.packageId,
      tenantId: hold.tenantId,
      active: true,
      paymentMode: 'PAYMENT_OFFLINE',
    },
  })
  if (!pkgRow) {
    throw new Error('Selected package does not support offline payment.')
  }

  await assertPackageAccessForCheckout(
    hold.tenantId,
    pkgRow,
    input.packageAccessCode,
  )

  const selectedPackage = pkgRow as unknown as Package
  const shoeRentalPriceCents = getShoeRentalPriceCents(tenantForPricing)

  assertCompleteShoeSelections(
    hold.bowlerCount,
    input.shoeSelections ?? [],
    !selectedPackage.shoesIncluded,
  )

  const subtotalCents = calculateBookingTotal({
    package: selectedPackage,
    bowlerCount: hold.bowlerCount,
    laneCount: hold.laneCount,
    shoeSelections: input.shoeSelections ?? [],
    shoeRentalPriceCents,
    laneReservationCents: 0,
    selectedOptionalAddonIds: input.selectedOptionalAddonIds ?? [],
  }).totalAmount

  if (input.totalAmount !== subtotalCents) {
    throw new Error('Booking total changed — review your booking.')
  }

  for (let attempt = 0; attempt < OFFLINE_CODE_MAX_RETRIES; attempt++) {
    const confirmationCode = generateConfirmationCode()
    try {
      const booking = await withSerializableRetry(() =>
        prisma.$transaction(
          async (tx) => {
            const now = new Date()
            const liveHold = await tx.bookingHold.findUnique({
              where: { id: input.holdId },
            })
            if (!liveHold || liveHold.expiresAt <= now) {
              throw new Error(
                'Hold expired or not found — pick a new time slot.',
              )
            }

            await assertSlotCapacityAvailable(tx, {
              tenantId: liveHold.tenantId,
              startTime: liveHold.startTime,
              endTime: liveHold.endTime,
              laneCount: liveHold.laneCount,
              excludeHoldId: input.holdId,
            })

            const tenantRow = await tx.tenant.findUniqueOrThrow({
              where: { id: liveHold.tenantId },
            })
            const policySnapshot = policySnapshotFromTenantRow(tenantRow)

            const created = await tx.booking.create({
              data: {
                tenantId: liveHold.tenantId,
                confirmationCode,
                partyType: pkgRow.partyTypes[0] ?? 'OPEN',
                bowlerCount: liveHold.bowlerCount,
                laneCount: liveHold.laneCount,
                startTime: liveHold.startTime,
                endTime: liveHold.endTime,
                packageId: pkgRow.id,
                status: 'PENDING_PAYMENT',
                source: 'ONLINE',
                customerName: input.customerName,
                customerEmail: input.customerEmail,
                customerPhone: input.customerPhone || null,
                totalAmount: subtotalCents,
                smsReminderConsent: input.smsReminderConsent ?? false,
                marketingConsent: input.marketingConsent ?? false,
                selectedAddonIds: input.selectedOptionalAddonIds ?? [],
                cancellationWindowHoursSnapshot:
                  policySnapshot.cancellationWindowHours,
                rescheduleWindowHoursSnapshot:
                  policySnapshot.rescheduleWindowHours,
                bowlersPerLaneSnapshot: policySnapshot.bowlersPerLane,
                cancellationRefundPercentSnapshot:
                  policySnapshot.cancellationRefundPercent,
              },
            })

            const shoeSelections = input.shoeSelections ?? []
            if (shoeSelections.length > 0) {
              await tx.bookingBowler.createMany({
                data: shoeSelections.map((row, index) => ({
                  bookingId: created.id,
                  index,
                  shoeSize: row.size.length > 0 ? row.size : null,
                })),
              })
            }

            await assignBookingLanes(tx, {
              tenantId: liveHold.tenantId,
              bookingId: created.id,
              laneCount: liveHold.laneCount,
              startTime: liveHold.startTime,
              endTime: liveHold.endTime,
            })

            await tx.bookingHold.deleteMany({ where: { id: input.holdId } })

            return created
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      )

      return {
        confirmationCode: booking.confirmationCode,
        bookingId: booking.id,
        offlinePending: true,
        mocked: false,
      }
    } catch (err) {
      if (
        attempt < OFFLINE_CODE_MAX_RETRIES - 1 &&
        isUniqueConstraintOnField(err, ['confirmation_code'])
      ) {
        continue
      }
      throw err
    }
  }

  throw new Error('Could not create booking.')
}

export async function getBookingByConfirmationCode(
  code: string,
  email: string,
): Promise<BookingSummary | null> {
  const normalized = code.trim().toUpperCase()
  const emailNorm = email.trim().toLowerCase()
  if (!normalized || !emailNorm) return null
  if (isDevWithoutDb()) {
    return {
      id: 'bk_mock',
      confirmationCode: normalized,
      startTime: new Date(Date.now() + 86_400_000),
      endTime: new Date(Date.now() + 86_400_000 + 3_600_000),
      bowlerCount: 4,
      laneCount: 1,
      totalAmount: 4500,
      customerEmail: emailNorm,
      packageName: 'VIP Lane',
    }
  }
  const booking = await prisma.booking.findFirst({
    where: {
      confirmationCode: normalized,
      customerEmail: { equals: emailNorm, mode: 'insensitive' },
    },
    include: { package: true },
  })
  if (!booking) return null
  return {
    id: booking.id,
    confirmationCode: booking.confirmationCode,
    startTime: booking.startTime,
    endTime: booking.endTime,
    bowlerCount: booking.bowlerCount,
    laneCount: booking.laneCount,
    totalAmount: booking.totalAmount,
    customerEmail: booking.customerEmail,
    packageName: booking.package?.name ?? '',
  }
}

// ── Success-screen lookup ─────────────────────────────────

export interface BookingSummary {
  id: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  bowlerCount: number
  laneCount: number
  totalAmount: number
  customerEmail: string
  packageName: string
}

/**
 * Look up a booking by its Stripe PaymentIntent id. Used by /book/success
 * to render the confirmation screen after Stripe redirects back.
 *
 * Because the Booking row is created by the webhook (not the browser),
 * there is a small race window between Stripe.js's `confirmPayment`
 * resolving and the webhook landing. Caller polls every ~500ms.
 *
 * Returns null if no booking is found yet. In dev-without-db mode returns
 * a deterministic mock confirmation when the caller passes any non-empty
 * id, so the success page renders in design exploration.
 */
export async function getBookingByPaymentIntentId(
  paymentIntentId: string,
): Promise<BookingSummary | null> {
  if (!paymentIntentId) return null
  if (isDevWithoutDb()) {
    return {
      id: 'bk_mock',
      confirmationCode: 'MOCK-1A',
      startTime: new Date(Date.now() + 86_400_000),
      endTime: new Date(Date.now() + 86_400_000 + 3_600_000),
      bowlerCount: 4,
      laneCount: 1,
      totalAmount: 4500,
      customerEmail: 'jane@example.com',
      packageName: 'Classic Bowling',
    }
  }
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { booking: { include: { package: true } } },
  })
  if (!payment || !payment.booking) return null
  const booking = payment.booking
  return {
    id: booking.id,
    confirmationCode: booking.confirmationCode,
    startTime: booking.startTime,
    endTime: booking.endTime,
    bowlerCount: booking.bowlerCount,
    laneCount: booking.laneCount,
    totalAmount: booking.totalAmount,
    customerEmail: booking.customerEmail,
    packageName: booking.package?.name ?? '',
  }
}

export async function getConfirmationQrDataUri(
  confirmationCode: string,
): Promise<string> {
  return QRCode.toDataURL(confirmationCode, {
    width: 200,
    margin: 1,
  })
}

// ── Helpers ───────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isPrismaSerializationConflict(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2034'
  )
}

async function assertSlotCapacityAvailable(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string
    startTime: Date
    endTime: Date
    laneCount: number
    excludeHoldId?: string
    excludeBookingId?: string
  },
): Promise<void> {
  const now = new Date()
  await tx.bookingHold.deleteMany({
    where: { tenantId: input.tenantId, expiresAt: { lt: now } },
  })

  const totalLanes = await tx.lane.count({
    where: { tenantId: input.tenantId, active: true },
  })
  const confirmed = await tx.booking.findMany({
    where: {
      tenantId: input.tenantId,
      status: { in: [...CAPACITY_BOOKING_STATUSES] },
      ...(input.excludeBookingId
        ? { id: { not: input.excludeBookingId } }
        : {}),
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { startTime: true, endTime: true, laneCount: true },
  })
  const held = await tx.bookingHold.findMany({
    where: {
      tenantId: input.tenantId,
      ...(input.excludeHoldId ? { id: { not: input.excludeHoldId } } : {}),
      expiresAt: { gt: now },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { startTime: true, endTime: true, laneCount: true },
  })
  const blocks = await findOverlappingBlockedSlots(
    tx,
    input.tenantId,
    input.startTime,
    input.endTime,
  )

  const reserved = sumReservedLanesIncludingBlocks(
    [...confirmed, ...held],
    blocks,
    input.startTime,
    input.endTime,
    totalLanes,
  )
  if (totalLanes - reserved < input.laneCount) {
    throw new Error('Selected time slot is no longer available.')
  }
}

async function withSerializableRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= HOLD_TRANSACTION_MAX_ATTEMPTS; attempt++) {
    try {
      return await operation()
    } catch (err) {
      if (!isPrismaSerializationConflict(err)) {
        throw err
      }
      if (attempt === HOLD_TRANSACTION_MAX_ATTEMPTS) {
        throw new Error('Selected time slot is no longer available.')
      }
    }
  }
  throw new Error('Selected time slot is no longer available.')
}
