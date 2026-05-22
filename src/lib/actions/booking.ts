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

import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { getLaneCount } from '@/lib/lane-logic'
import { calculatePrice } from '@/lib/pricing'
import { createPaymentIntent, isStripeMocked } from '@/lib/stripe'
import type { Package, TimeSlot } from '@/types'
import { Prisma } from '@prisma/client'

const HOLD_TIMEOUT_MINS_DEFAULT = 10
const HOLD_ACQUIRE_MAX_ATTEMPTS = 3

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
  _tenantId: string,
  days: number = 7,
): Promise<AvailableDate[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const out: AvailableDate[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    out.push({
      date: toISODate(d),
      weekday: DATE_WEEKDAY_FORMATTER.format(d),
      day: d.getDate(),
      available: true,
    })
  }
  return out
}

// ── Time slots ────────────────────────────────────────────

export async function getAvailableTimeSlots(
  tenantId: string,
  dateISO: string,
  bowlerCount: number,
): Promise<TimeSlot[]> {
  if (!isDevWithoutDb()) {
    await cleanupExpiredHolds(tenantId)
  }
  const slots = buildMockSlotsFor(dateISO)
  if (isDevWithoutDb()) {
    return slots
  }

  const laneCount = getLaneCount(bowlerCount)
  const totalLanes = await prisma.lane.count({
    where: { tenantId, active: true },
  })
  const dayStart = slots[0]?.startTime
  const dayEnd = slots[slots.length - 1]?.endTime
  if (dayStart == null || dayEnd == null) return slots

  const [confirmed, held] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
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
  ])

  return slots.map((slot) => {
    const overlapping = [...confirmed, ...held].filter(
      (b) => b.startTime < slot.endTime && b.endTime > slot.startTime,
    )
    const reserved = overlapping.reduce((acc, b) => acc + b.laneCount, 0)
    const available = totalLanes - reserved >= laneCount
    return { ...slot, available }
  })
}

function buildMockSlotsFor(dateISO: string): TimeSlot[] {
  const base = new Date(`${dateISO}T00:00:00`)
  const out: TimeSlot[] = []
  for (let hour = 16; hour < 24; hour++) {
    const start = new Date(base)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start)
    end.setHours(hour + 1)
    out.push({
      id: `${dateISO}-${hour}`,
      startTime: start,
      endTime: end,
      available: true,
      laneNumbers: [],
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
  const laneCount = getLaneCount(input.bowlerCount)
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

  if (isDevWithoutDb()) {
    const expiresAt = new Date(Date.now() + HOLD_TIMEOUT_MINS_DEFAULT * 60_000)
    return { holdId: `hold_mock_${Date.now()}`, expiresAt }
  }

  for (let attempt = 1; attempt <= HOLD_ACQUIRE_MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const tenant = await tx.tenant.findUnique({
            where: { id: input.tenantId },
            select: { holdTimeoutMins: true, maxOnlineBowlers: true },
          })
          if (!tenant) throw new Error('Tenant not found')
          if (input.bowlerCount > tenant.maxOnlineBowlers) {
            throw new Error('Group size exceeds online booking limit.')
          }

          const now = new Date()
          await tx.bookingHold.deleteMany({
            where: { tenantId: input.tenantId, expiresAt: { lt: now } },
          })

          const dayStart = input.startTime
          const dayEnd = input.endTime
          const [totalLanes, confirmed, held] = await Promise.all([
            tx.lane.count({
              where: { tenantId: input.tenantId, active: true },
            }),
            tx.booking.findMany({
              where: {
                tenantId: input.tenantId,
                status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
                startTime: { lt: dayEnd },
                endTime: { gt: dayStart },
              },
              select: { laneCount: true },
            }),
            tx.bookingHold.findMany({
              where: {
                tenantId: input.tenantId,
                expiresAt: { gt: now },
                startTime: { lt: dayEnd },
                endTime: { gt: dayStart },
              },
              select: { laneCount: true },
            }),
          ])

          const reserved = [...confirmed, ...held].reduce(
            (acc, b) => acc + b.laneCount,
            0,
          )
          if (totalLanes - reserved < laneCount) {
            throw new Error(
              'Selected time slot is no longer available — pick another time.',
            )
          }

          const holdMins =
            tenant.holdTimeoutMins ?? HOLD_TIMEOUT_MINS_DEFAULT
          const expiresAt = new Date(Date.now() + holdMins * 60_000)
          const hold = await tx.bookingHold.create({
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
          return { holdId: hold.id, expiresAt: hold.expiresAt }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (err) {
      if (
        isPrismaTransactionConflict(err) &&
        attempt < HOLD_ACQUIRE_MAX_ATTEMPTS
      ) {
        continue
      }
      throw err
    }
  }

  throw new Error('Could not acquire booking hold.')
}

export async function releaseBookingHold(holdId: string): Promise<void> {
  if (isDevWithoutDb() || holdId.trim().length === 0) return
  await prisma.bookingHold.deleteMany({ where: { id: holdId } })
}

// ── Packages ──────────────────────────────────────────────

export async function getPackagesForTenant(
  tenantId: string,
): Promise<Package[]> {
  if (isDevWithoutDb()) {
    return mockPackages(tenantId)
  }
  const rows = await prisma.package.findMany({
    where: { tenantId, active: true },
    orderBy: { sortOrder: 'asc' },
  })
  return rows as unknown as Package[]
}

function mockPackages(tenantId: string): Package[] {
  return [
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
      partyTypes: ['OPEN'],
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
      partyTypes: ['OPEN'],
      active: true,
      sortOrder: 2,
    },
    {
      id: 'pkg-birthday',
      tenantId,
      name: 'Birthday Party',
      description: 'Two hours of bowling, pizza, and soda for the group.',
      basePrice: 12000,
      gameIncluded: true,
      shoesIncluded: true,
      gameCostPer: null,
      shoeCostPer: null,
      partyTypes: ['BIRTHDAY'],
      active: true,
      sortOrder: 3,
    },
  ]
}

// ── Confirm: create PaymentIntent, return clientSecret ────

export interface ConfirmBookingInput {
  tenantId: string
  holdId: string
  packageId: string
  partyType: 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'
  bowlerCount: number
  startTime: Date
  endTime: Date
  totalAmount: number
  customerName: string
  customerEmail: string
  customerPhone: string
}

export interface ConfirmBookingResult {
  clientSecret: string
  paymentIntentId: string
  mocked: boolean
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
  let packageId = input.packageId
  let partyType = input.partyType
  let bowlerCount = input.bowlerCount
  let startTime = input.startTime
  let endTime = input.endTime
  let totalAmount = input.totalAmount

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

    const pkg = await prisma.package.findFirst({
      where: { id: input.packageId, tenantId: hold.tenantId, active: true },
    })
    if (!pkg) {
      throw new Error('Selected package is no longer available.')
    }
    if (!pkg.partyTypes.includes(input.partyType)) {
      throw new Error('Selected package is not available for this party type.')
    }

    tenantId = hold.tenantId
    packageId = pkg.id
    partyType = input.partyType
    bowlerCount = hold.bowlerCount
    startTime = hold.startTime
    endTime = hold.endTime
    totalAmount = calculatePrice({
      package: pkg as unknown as Package,
      bowlerCount,
    }).totalAmount

    if (input.totalAmount !== totalAmount) {
      throw new Error('Booking total changed — review your package pricing.')
    }
  }

  const metadata: Record<string, string> = {
    holdId: input.holdId,
    tenantId,
    packageId,
    partyType,
    bowlerCount: String(bowlerCount),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
  }

  const intent = await createPaymentIntent({
    amountCents: totalAmount,
    customerEmail: input.customerEmail,
    description: `Booking for ${bowlerCount} bowlers`,
    metadata,
  })

  return {
    clientSecret: intent.clientSecret,
    paymentIntentId: intent.id,
    mocked: intent.mocked || isStripeMocked(),
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

// ── Helpers ───────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isPrismaTransactionConflict(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2034'
  )
}
