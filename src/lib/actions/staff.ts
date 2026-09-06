'use server'

// staff.ts — Server actions for the staff & admin shells.
//
// Every action enforces a role via `requireRole(...)`. Role-gating is
// server-side ONLY; never trust a client-side role claim.
//
// Dev-without-DB: every read returns a deterministic mock set so the
// staff UI is reviewable without Postgres. Writes (createWalkInBooking,
// blockLanes, unblockLanes) are no-ops in mock mode — they log and
// return a synthesized id.

import { revalidatePath } from 'next/cache'

import { Prisma } from '@/generated/prisma/client'

import { requireRole, type CurrentUser } from '@/lib/auth'
import { generateConfirmationCode } from '@/lib/booking-codes'
import { policySnapshotFromTenantRow } from '@/lib/booking-snapshots'
import {
  assignLanesGreedy,
  buildCockpitLanes,
  buildCockpitStats,
  toCockpitBookings,
} from '@/lib/cockpit-display'
import { isDevWithoutDb, shouldUseDevDbFallback, warnOnce } from '@/lib/env'
import {
  blockedLaneNumbersForWindow,
  findOverlappingBlockedSlots,
  sumReservedLanesIncludingBlocks,
} from '@/lib/blocked-lanes'
import { reassignBookingLanes } from '@/lib/lane-assignment'
import { getLaneCount, CAPACITY_BOOKING_STATUSES } from '@/lib/lane-logic'
import { assertBookingDurationWithinLimits } from '@/lib/tenant-config'
import type { Tenant } from '@/types'
import { isUniqueConstraintOnField } from '@/lib/prisma-errors'
import { prisma } from '@/lib/prisma'
import { sendBookingCancellation } from '@/lib/email'
import { createRefund } from '@/lib/stripe'
import {
  assertStaffTenantAccess,
  requireUserTenantId,
} from '@/lib/tenant-access'

const WALK_IN_CODE_MAX_RETRIES = 5

function requireStaffTenantId(user: CurrentUser): string {
  return requireUserTenantId(user)
}

// ── Shared types ──────────────────────────────────────────

export interface StaffBookingRow {
  id: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  bowlerCount: number
  laneCount: number
  customerName: string
  customerEmail: string
  customerPhone: string | null
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'HOLD' | 'PENDING_PAYMENT'
  source: 'ONLINE' | 'WALK_IN' | 'PHONE'
  packageName: string
  totalAmount: number
  isRefunded: boolean
  /** Dev / offline-payment bookings until PENDING_PAYMENT status ships. */
  paymentPending?: boolean
}

export interface StaffBookingDetail extends StaffBookingRow {
  partyType: 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'
  notes: string | null
  payment: {
    id: string
    amount: number
    status: string
    stripePaymentIntentId: string | null
    refundAmount: number | null
    refundStatus: 'NONE' | 'PENDING' | 'SUCCEEDED' | 'FAILED'
    refundedAt: Date | null
  } | null
  createdAt: Date
  checkedInAt: Date | null
  shoeSizes: string[]
}

export interface BlockedSlotRow {
  id: string
  startTime: Date
  endTime: Date
  reason: string | null
  /** Lane numbers blocked; empty array = all lanes. */
  lanes: number[]
}

export type CockpitLaneState = 'available' | 'occupied' | 'upcoming' | 'blocked'

export interface CockpitLaneCard {
  number: number
  state: CockpitLaneState
  statusLabel: string
  timeLabel?: string
  detail?: string
  bookingId?: string
}

export type CockpitListStatus =
  | 'pending'
  | 'confirmed'
  | 'checkedin'
  | 'payment'
  | 'late'

export interface CockpitStats {
  total: number
  upcoming: number
  active: number
  done: number
  late: number
}

export interface CockpitBookingRow extends StaffBookingRow {
  laneNumbers: number[]
  listStatus: CockpitListStatus
  paymentPending: boolean
}

export interface CockpitSnapshot {
  lanes: CockpitLaneCard[]
  bookings: CockpitBookingRow[]
  blocks: BlockedSlotRow[]
  totalLanes: number
  stats: CockpitStats
  referenceNow: string
}

// ── Cockpit: today's bookings ─────────────────────────────

export async function getTodayBookings(
  tenantId: string,
): Promise<StaffBookingRow[]> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)
  const today = startOfDay(new Date())
  const tomorrow = new Date(today.getTime() + 86_400_000)

  if (isDevWithoutDb()) {
    return mockBookingsForRange(tenantId, today, tomorrow)
  }

  const rows = await prisma.booking.findMany({
    where: {
      tenantId,
      status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
      startTime: { gte: today, lt: tomorrow },
    },
    include: { package: { select: { name: true } } },
    orderBy: { startTime: 'asc' },
  })
  return rows.map(toBookingRow)
}

export async function getCockpitSnapshot(
  tenantId: string,
): Promise<CockpitSnapshot> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)
  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const todayISO = isoDateFromParts(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )

  if (shouldUseDevDbFallback()) {
    warnOnce(
      'cockpit-db',
      'DATABASE_URL not set — returning mock cockpit snapshot for dev.',
    )
    return mockCockpitSnapshot(tenantId, now)
  }

  try {
    const [laneRows, schedule, bookingsWithLanes] = await Promise.all([
      prisma.lane.findMany({
        where: { tenantId, active: true },
        orderBy: { number: 'asc' },
        select: { number: true },
      }),
      getScheduleForDate(tenantId, todayISO),
      prisma.booking.findMany({
        where: {
          tenantId,
          status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'HOLD'] },
          startTime: { lt: tomorrow },
          endTime: { gt: today },
        },
        include: {
          package: { select: { name: true } },
          lanes: { include: { lane: { select: { number: true } } } },
        },
        orderBy: { startTime: 'asc' },
      }),
    ])

    const totalLanes = Math.max(laneRows.length, 1)
    const bookingRows = bookingsWithLanes.map((row) => toBookingRow(row))
    const laneAssignments = assignLanesGreedy(bookingRows, totalLanes)

    for (const row of bookingsWithLanes) {
      const numbers = row.lanes.map((bl) => bl.lane.number).sort((a, b) => a - b)
      if (numbers.length > 0) {
        laneAssignments.set(row.id, numbers)
      }
    }

    const cockpitBookings = toCockpitBookings(bookingRows, laneAssignments, now)

    return {
      totalLanes,
      bookings: cockpitBookings,
      blocks: schedule.blocks,
      stats: buildCockpitStats(cockpitBookings, now),
      referenceNow: now.toISOString(),
      lanes: buildCockpitLanes(
        totalLanes,
        cockpitBookings,
        schedule.blocks,
        now,
      ),
    }
  } catch (err) {
    if (shouldUseDevDbFallback(err)) {
      warnOnce(
        'cockpit-db',
        'Database unreachable — returning mock cockpit snapshot for dev. ' +
          'Wake your Neon project or fix DATABASE_URL.',
      )
      return mockCockpitSnapshot(tenantId, now)
    }
    throw err
  }
}

// ── Schedule: bookings + blocks for a specific date ───────

export interface ScheduleDay {
  bookings: StaffBookingRow[]
  blocks: BlockedSlotRow[]
}

export type ScheduleDensityLevel = 'low' | 'busy' | 'full'
export type ScheduleBlockLevel = 'none' | 'partial' | 'full'

export interface ScheduleDaySummary {
  dateISO: string
  bookingCount: number
  densityPercent: number
  densityLevel: ScheduleDensityLevel
  blockLevel: ScheduleBlockLevel
}

export interface ScheduleMonthSummary {
  totalLanes: number
  days: ScheduleDaySummary[]
  blocks: BlockedSlotRow[]
}

function overlapsDay(
  start: Date,
  end: Date,
  dayStart: Date,
  dayEnd: Date,
): boolean {
  return start < dayEnd && end > dayStart
}

function densityLevelFromPercent(percent: number): ScheduleDensityLevel {
  if (percent >= 90) return 'full'
  if (percent >= 50) return 'busy'
  return 'low'
}

function blockLevelForDay(
  dayBlocks: BlockedSlotRow[],
  totalLanes: number,
): ScheduleBlockLevel {
  if (dayBlocks.length === 0) return 'none'
  if (dayBlocks.some((b) => b.lanes.length === 0)) return 'full'
  const blocked = new Set<number>()
  for (const b of dayBlocks) {
    for (const lane of b.lanes) blocked.add(lane)
  }
  if (totalLanes > 0 && blocked.size >= totalLanes) return 'full'
  return 'partial'
}

function isoDateFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export async function getScheduleForMonth(
  tenantId: string,
  year: number,
  month: number,
): Promise<ScheduleMonthSummary> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)
  const monthStart = startOfDay(new Date(year, month, 1))
  const monthEnd = startOfDay(new Date(year, month + 1, 1))
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  if (isDevWithoutDb()) {
    return mockScheduleMonth(tenantId, year, month, daysInMonth)
  }

  const [totalLanes, bookings, blocks] = await Promise.all([
    prisma.lane.count({ where: { tenantId } }),
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
        startTime: { lt: monthEnd },
        endTime: { gt: monthStart },
      },
      select: { startTime: true, endTime: true, laneCount: true },
    }),
    prisma.blockedSlot.findMany({
      where: {
        tenantId,
        startTime: { lt: monthEnd },
        endTime: { gt: monthStart },
      },
      orderBy: { startTime: 'asc' },
    }),
  ])

  const blockRows = blocks.map((b) => ({
    id: b.id,
    startTime: b.startTime,
    endTime: b.endTime,
    reason: b.reason,
    lanes: b.lanes,
  }))

  const days: ScheduleDaySummary[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = isoDateFromParts(year, month, day)
    const dayStart = startOfDay(new Date(`${dateISO}T00:00:00`))
    const dayEnd = new Date(dayStart.getTime() + 86_400_000)

    const dayBookings = bookings.filter((b) =>
      overlapsDay(b.startTime, b.endTime, dayStart, dayEnd),
    )
    const dayBlocks = blockRows.filter((b) =>
      overlapsDay(b.startTime, b.endTime, dayStart, dayEnd),
    )
    const laneSum = dayBookings.reduce((acc, b) => acc + b.laneCount, 0)
    const densityPercent =
      totalLanes > 0
        ? Math.min(100, Math.round((laneSum / totalLanes) * 100))
        : 0

    days.push({
      dateISO,
      bookingCount: dayBookings.length,
      densityPercent,
      densityLevel: densityLevelFromPercent(densityPercent),
      blockLevel: blockLevelForDay(dayBlocks, totalLanes),
    })
  }

  return { totalLanes, days, blocks: blockRows }
}

export async function getScheduleForDate(
  tenantId: string,
  dateISO: string,
): Promise<ScheduleDay> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)
  const dayStart = startOfDay(new Date(`${dateISO}T00:00:00`))
  const dayEnd = new Date(dayStart.getTime() + 86_400_000)

  if (isDevWithoutDb()) {
    return {
      bookings: mockBookingsForRange(tenantId, dayStart, dayEnd),
      blocks: mockBlocks(dayStart),
    }
  }

  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      include: { package: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
    }),
    prisma.blockedSlot.findMany({
      where: {
        tenantId,
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      orderBy: { startTime: 'asc' },
    }),
  ])
  return {
    bookings: bookings.map(toBookingRow),
    blocks: blocks.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason,
      lanes: b.lanes,
    })),
  }
}

// ── Booking detail ────────────────────────────────────────

export async function getBookingDetail(
  bookingId: string,
): Promise<StaffBookingDetail | null> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockBookingDetail(bookingId)
  }
  if (!user.tenantId) return null
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, tenantId: user.tenantId },
    include: {
      package: { select: { name: true } },
      payment: true,
      bowlers: { orderBy: { index: 'asc' } },
    },
  })
  if (!booking) return null
  return {
    ...toBookingRow(booking),
    partyType: booking.partyType,
    notes: booking.notes,
    createdAt: booking.createdAt,
    checkedInAt: booking.checkedInAt,
    shoeSizes: booking.bowlers
      .map((b) => b.shoeSize)
      .filter((s): s is string => s != null && s.length > 0),
    payment: booking.payment
      ? {
          id: booking.payment.id,
          amount: booking.payment.amount,
          status: booking.payment.status,
          stripePaymentIntentId: booking.payment.stripePaymentIntentId,
          refundAmount: booking.payment.refundAmount,
          refundStatus: booking.payment.refundStatus,
          refundedAt: booking.payment.refundedAt,
        }
      : null,
  }
}

// ── Walk-in creation ──────────────────────────────────────

export type WalkInPaymentMethod = 'cash' | 'card_at_counter' | 'pending'

export interface CreateWalkInInput {
  tenantId: string
  /** Omit or null for lane-only bookings (uses tenant default package row). */
  packageId?: string | null
  partyType: 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'
  bowlerCount: number
  startTime: Date
  endTime: Date
  totalAmount: number
  customerName: string
  customerEmail: string
  customerPhone?: string
  notes?: string
  paymentMethod: WalkInPaymentMethod
  source?: 'WALK_IN' | 'PHONE'
  /** Lane numbers to assign; auto-assign is computed client-side when omitted. */
  laneNumbers?: number[]
}

export interface CreateWalkInResult {
  bookingId: string
  confirmationCode: string
  mocked: boolean
}

export async function createWalkInBooking(
  input: CreateWalkInInput,
): Promise<CreateWalkInResult> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')

  if (input.totalAmount < 0) {
    throw new Error('createWalkInBooking: totalAmount must be non-negative')
  }
  if (input.bowlerCount < 1) {
    throw new Error('createWalkInBooking: bowlerCount must be >= 1')
  }

  const staffTenantId = requireStaffTenantId(user)
  if (input.tenantId !== staffTenantId) {
    throw new Error('Resource not found.')
  }

  if (isDevWithoutDb()) {
    console.log(
      `[staff-actions] mock walk-in created by ${user.email} for ${input.customerName}`,
    )
    return {
      bookingId: `bk_walkin_mock_${Date.now()}`,
      confirmationCode: generateConfirmationCode(),
      mocked: true,
    }
  }

  let booking: Awaited<ReturnType<typeof prisma.booking.create>> | null = null
  const bookingSource = input.source ?? 'WALK_IN'

  let resolvedPackageId = input.packageId ?? null
  if (resolvedPackageId) {
    const pkg = await prisma.package.findFirst({
      where: {
        id: resolvedPackageId,
        tenantId: staffTenantId,
        active: true,
      },
      select: { id: true },
    })
    if (!pkg) {
      throw new Error('Package not found.')
    }
    resolvedPackageId = pkg.id
  } else {
    const fallback = await prisma.package.findFirst({
      where: { tenantId: staffTenantId, active: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    })
    if (!fallback) {
      throw new Error('createWalkInBooking: no packages configured for tenant')
    }
    resolvedPackageId = fallback.id
  }

  for (let attempt = 0; attempt < WALK_IN_CODE_MAX_RETRIES; attempt++) {
    const confirmationCode = generateConfirmationCode()
    try {
      booking = await prisma.$transaction(
        async (tx) => {
        const tenantRow = await tx.tenant.findUniqueOrThrow({
          where: { id: input.tenantId },
        })
        const policySnapshot = policySnapshotFromTenantRow(tenantRow)
        const bowlersPerLane = tenantRow.bowlersPerLane
        const laneCount = getLaneCount(input.bowlerCount, bowlersPerLane)
        const now = new Date()

        const overlapping = await tx.booking.findMany({
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
        const totalLanes = await tx.lane.count({
          where: { tenantId: input.tenantId, active: true },
        })
        const blocks = await findOverlappingBlockedSlots(
          tx,
          input.tenantId,
          input.startTime,
          input.endTime,
        )
        const reserved = sumReservedLanesIncludingBlocks(
          [...overlapping, ...activeHolds],
          blocks,
          input.startTime,
          input.endTime,
          totalLanes,
        )
        if (totalLanes - reserved < laneCount) {
          throw new Error('Selected time is no longer available.')
        }

        if (input.laneNumbers?.length) {
          if (input.laneNumbers.length !== laneCount) {
            throw new Error('Lane count does not match party size.')
          }
          const laneRows = await tx.lane.findMany({
            where: { tenantId: input.tenantId, active: true },
            orderBy: { number: 'asc' },
          })
          const activeNumbers = laneRows.map((lane) => lane.number)
          const blocked = blockedLaneNumbersForWindow(
            blocks,
            input.startTime,
            input.endTime,
            activeNumbers,
          )
          const overlappingWithLanes = await tx.booking.findMany({
            where: {
              tenantId: input.tenantId,
              status: { in: [...CAPACITY_BOOKING_STATUSES] },
              startTime: { lt: input.endTime },
              endTime: { gt: input.startTime },
            },
            include: {
              lanes: { include: { lane: { select: { number: true } } } },
            },
          })
          const occupied = new Set<number>()
          for (const row of overlappingWithLanes) {
            for (const link of row.lanes) {
              occupied.add(link.lane.number)
            }
          }
          for (const number of input.laneNumbers) {
            if (!activeNumbers.includes(number)) {
              throw new Error('Selected lane is not available.')
            }
            if (blocked.has(number)) {
              throw new Error('Selected lane is blocked during this time.')
            }
            if (occupied.has(number)) {
              throw new Error('Selected lane is not available.')
            }
          }
        }

        const created = await tx.booking.create({
          data: {
            tenantId: input.tenantId,
            userId: user.id,
            confirmationCode,
            partyType: input.partyType,
            bowlerCount: input.bowlerCount,
            laneCount: getLaneCount(input.bowlerCount, bowlersPerLane),
            startTime: input.startTime,
            endTime: input.endTime,
            packageId: resolvedPackageId!,
            status: 'CONFIRMED',
            source: bookingSource,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone ?? null,
            totalAmount: input.totalAmount,
            notes: input.notes ?? null,
            isRefunded: false,
            cancellationWindowHoursSnapshot:
              policySnapshot.cancellationWindowHours,
            rescheduleWindowHoursSnapshot:
              policySnapshot.rescheduleWindowHours,
            bowlersPerLaneSnapshot: policySnapshot.bowlersPerLane,
            cancellationRefundPercentSnapshot:
              policySnapshot.cancellationRefundPercent,
          },
        })

        if (input.laneNumbers?.length) {
          const laneRows = await tx.lane.findMany({
            where: {
              tenantId: input.tenantId,
              number: { in: input.laneNumbers },
            },
            select: { id: true },
          })
          for (const lane of laneRows) {
            await tx.bookingLane.create({
              data: { bookingId: created.id, laneId: lane.id },
            })
          }
        }

        if (input.totalAmount > 0) {
          await tx.payment.create({
            data: {
              bookingId: created.id,
              amount: input.totalAmount,
              status: 'succeeded',
              paymentMethod: input.paymentMethod,
            },
          })
        }

        await tx.auditLog.create({
          data: {
            bookingId: created.id,
            userId: user.id,
            action: 'BOOKING_WALK_IN_CREATED',
            entityType: 'Booking',
            entityId: created.id,
            details: {
              paymentMethod: input.paymentMethod,
              source: bookingSource,
              laneNumbers: input.laneNumbers ?? [],
            },
          },
        })

        return created
      },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      break
    } catch (err) {
      const retryable =
        attempt < WALK_IN_CODE_MAX_RETRIES - 1 &&
        isUniqueConstraintOnField(err, ['confirmation_code'])
      if (retryable) {
        continue
      }
      throw err
    }
  }

  if (!booking) {
    throw new Error('createWalkInBooking: failed to allocate confirmation code')
  }

  revalidatePath('/staff')
  revalidatePath('/staff/schedule')

  return {
    bookingId: booking.id,
    confirmationCode: booking.confirmationCode,
    mocked: false,
  }
}

// ── Lane blocking ─────────────────────────────────────────

export interface BlockLanesInput {
  tenantId: string
  startTime: Date
  endTime: Date
  /** Lane numbers (NOT ids) to block. Empty array = all lanes. */
  lanes: number[]
  reason?: string
}

export interface BlockLanesResult {
  blockId: string
  mocked: boolean
}

export async function blockLanes(
  input: BlockLanesInput,
): Promise<BlockLanesResult> {
  // Spec (.claude/staff/04_SCHEDULE.md): only Admin may create lane blocks.
  const user = await requireRole('ADMIN')
  if (input.endTime <= input.startTime) {
    throw new Error('blockLanes: endTime must be after startTime')
  }
  assertStaffTenantAccess(user, input.tenantId)
  if (isDevWithoutDb()) {
    return { blockId: `block_mock_${Date.now()}`, mocked: true }
  }

  const block = await prisma.$transaction(
    async (tx) => {
    const created = await tx.blockedSlot.create({
      data: {
        tenantId: input.tenantId,
        startTime: input.startTime,
        endTime: input.endTime,
        lanes: input.lanes,
        reason: input.reason ?? null,
      },
    })
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: user.id,
        action: 'LANE_BLOCK_CREATED',
        entityType: 'BlockedSlot',
        entityId: created.id,
        details: { lanes: input.lanes, reason: input.reason ?? null },
      },
    })
    return created
  },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

  revalidatePath('/staff/schedule')
  return { blockId: block.id, mocked: false }
}

// ── Booking lifecycle (check-in, no-show, complete) ───────

export async function checkInBookingAction(bookingId: string): Promise<void> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb()) return
  const tenantId = requireStaffTenantId(user)
  await prisma.$transaction(async (tx) => {
    const result = await tx.booking.updateMany({
      where: {
        id: bookingId,
        tenantId,
        status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
      },
      data: { checkedInAt: new Date() },
    })
    if (result.count === 0) {
      throw new Error('Booking not found or cannot be checked in.')
    }
    await tx.auditLog.create({
      data: {
        bookingId,
        userId: user.id,
        action: 'BOOKING_CHECKED_IN',
        entityType: 'Booking',
        entityId: bookingId,
      },
    })
  })
  revalidatePath(`/staff/bookings/${bookingId}`)
  revalidatePath('/staff')
}

export async function markBookingNoShowAction(
  bookingId: string,
): Promise<void> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb()) return
  const tenantId = requireStaffTenantId(user)
  await prisma.$transaction(async (tx) => {
    const result = await tx.booking.updateMany({
      where: {
        id: bookingId,
        tenantId,
        status: 'CONFIRMED',
      },
      data: { status: 'NO_SHOW', cancellationReason: 'NO_SHOW' },
    })
    if (result.count === 0) {
      throw new Error('Booking not found or cannot be marked no-show.')
    }
    await tx.auditLog.create({
      data: {
        bookingId,
        userId: user.id,
        action: 'BOOKING_NO_SHOW',
        entityType: 'Booking',
        entityId: bookingId,
      },
    })
  })
  revalidatePath(`/staff/bookings/${bookingId}`)
  revalidatePath('/staff')
}

export type StaffCancelReason = 'CUSTOMER_REQUEST' | 'NO_SHOW' | 'VENUE_ISSUE'

export interface StaffCancelBookingInput {
  bookingId: string
  reason: StaffCancelReason
  /** MANAGER+ only. Ignored/rejected for STAFF. Requires a Stripe payment. */
  issueRefund?: boolean
}

export interface StaffCancelBookingResult {
  cancelled: true
  refundPending: boolean
  refundAmountCents: number
  mocked: boolean
}

/**
 * Staff cancel per `.claude/staff/03_MODIFICATION.md`.
 * STAFF may cancel without refund. MANAGER/ADMIN may optionally issue a
 * Stripe refund for card payments (walk-ins stay non-Stripe).
 */
export async function staffCancelBookingAction(
  input: StaffCancelBookingInput,
): Promise<StaffCancelBookingResult> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const issueRefund = input.issueRefund === true

  if (issueRefund && user.role === 'STAFF') {
    throw new Error('Only managers can issue refunds when cancelling.')
  }

  if (isDevWithoutDb()) {
    console.log(`[staff] mock cancel booking ${input.bookingId}`, input)
    revalidatePath('/staff')
    return {
      cancelled: true,
      refundPending: issueRefund,
      refundAmountCents: issueRefund ? 4500 : 0,
      mocked: true,
    }
  }

  const tenantId = requireStaffTenantId(user)
  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, tenantId },
    include: { payment: true },
  })
  if (!booking) throw new Error('Booking not found.')
  if (booking.status === 'CANCELLED') {
    throw new Error('Booking is already cancelled.')
  }
  if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING_PAYMENT') {
    throw new Error('Only active bookings can be cancelled.')
  }

  if (issueRefund) {
    if (!booking.payment?.stripePaymentIntentId) {
      throw new Error(
        'Stripe refund is not available for this booking. Use a manual refund instead.',
      )
    }
    if (booking.isRefunded) {
      throw new Error('Booking is already refunded.')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancellationReason: input.reason,
      },
    })
    await tx.auditLog.create({
      data: {
        tenantId,
        bookingId: booking.id,
        userId: user.id,
        action: 'BOOKING_STAFF_CANCELLED',
        entityType: 'Booking',
        entityId: booking.id,
        details: {
          reason: input.reason,
          issueRefund,
          cancelledByRole: user.role,
        },
      },
    })
  })

  let refundPending = false
  let refundAmountCents = 0
  if (issueRefund && booking.payment?.stripePaymentIntentId) {
    const payment = booking.payment
    const alreadyRefunded = payment.refundAmount ?? 0
    const remaining = Math.max(payment.amount - alreadyRefunded, 0)
    if (remaining > 0) {
      const refund = await createRefund({
        paymentIntentId: payment.stripePaymentIntentId,
        amountCents: remaining,
        reason: 'requested_by_customer',
        idempotencyKey: `staff-cancel-refund:${booking.id}:${alreadyRefunded + remaining}`,
        metadata: {
          bookingId: booking.id,
          source: 'staff_cancel',
          reason: input.reason,
        },
      })
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            stripeRefundId: refund.id,
            refundAmount: alreadyRefunded + remaining,
            refundStatus: 'PENDING',
            refundReason: `Staff cancel (${input.reason})`,
            refundedBy: user.id,
          },
        })
        await tx.auditLog.create({
          data: {
            tenantId,
            bookingId: booking.id,
            userId: user.id,
            action: 'BOOKING_REFUND_REQUESTED',
            entityType: 'Booking',
            entityId: booking.id,
            details: {
              stripeRefundId: refund.id,
              amount: remaining,
              source: 'staff_cancel',
              reason: input.reason,
            },
          },
        })
      })
      refundPending = true
      refundAmountCents = remaining
    }
  }

  await sendBookingCancellation({
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    confirmationCode: booking.confirmationCode,
    startTime: booking.startTime,
    refundAmountCents,
    refundPending,
  }).catch((err) => {
    console.error('[staffCancelBookingAction] cancellation email failed', err)
  })

  revalidatePath(`/staff/bookings/${booking.id}`)
  revalidatePath('/staff')
  revalidatePath('/staff/schedule')

  return {
    cancelled: true,
    refundPending,
    refundAmountCents,
    mocked: false,
  }
}

export async function staffUpdateBookingNotesAction(
  bookingId: string,
  notes: string,
): Promise<void> {
  await staffModifyBookingAction({ bookingId, notes })
}

export interface StaffModifyBookingInput {
  bookingId: string
  startTime?: Date
  endTime?: Date
  bowlerCount?: number
  packageId?: string
  notes?: string | null
}

const MODIFY_RESERVING_STATUSES = CAPACITY_BOOKING_STATUSES

export async function staffModifyBookingAction(
  input: StaffModifyBookingInput,
): Promise<void> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')

  if (isDevWithoutDb()) {
    console.log(`[staff] mock modify booking ${input.bookingId}`, input)
    revalidatePath('/staff')
    return
  }

  const tenantId = requireStaffTenantId(user)

  await prisma.$transaction(
    async (tx) => {
    const existing = await tx.booking.findFirst({
      where: { id: input.bookingId, tenantId },
    })
    if (!existing) throw new Error('Booking not found.')
    if (
      existing.status !== 'CONFIRMED' &&
      existing.status !== 'PENDING_PAYMENT'
    ) {
      throw new Error('Only active bookings can be modified.')
    }

    const startTime = input.startTime ?? existing.startTime
    const endTime = input.endTime ?? existing.endTime
    if (endTime <= startTime) {
      throw new Error('End time must be after start time.')
    }

    const tenantRow = await tx.tenant.findUniqueOrThrow({
      where: { id: existing.tenantId },
    })
    const tenantForLimits = {
      config: tenantRow.config,
    } as Tenant
    assertBookingDurationWithinLimits(tenantForLimits, startTime, endTime)

    const bowlerCount = input.bowlerCount ?? existing.bowlerCount
    const bowlersPerLane =
      existing.bowlersPerLaneSnapshot ?? tenantRow.bowlersPerLane
    const laneCount = getLaneCount(bowlerCount, bowlersPerLane)

    const now = new Date()
    const overlapping = await tx.booking.findMany({
      where: {
        tenantId: existing.tenantId,
        status: { in: [...MODIFY_RESERVING_STATUSES] },
        id: { not: input.bookingId },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { startTime: true, endTime: true, laneCount: true },
    })
    const activeHolds = await tx.bookingHold.findMany({
      where: {
        tenantId: existing.tenantId,
        expiresAt: { gt: now },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { startTime: true, endTime: true, laneCount: true },
    })
    const totalLanes = await tx.lane.count({
      where: { tenantId: existing.tenantId, active: true },
    })
    const blocks = await findOverlappingBlockedSlots(
      tx,
      existing.tenantId,
      startTime,
      endTime,
    )
    const reserved = sumReservedLanesIncludingBlocks(
      [...overlapping, ...activeHolds],
      blocks,
      startTime,
      endTime,
      totalLanes,
    )
    if (totalLanes - reserved < laneCount) {
      throw new Error('Selected time is no longer available.')
    }

    let packageId = input.packageId ?? existing.packageId
    let partyType = existing.partyType
    if (input.packageId != null) {
      const pkg = await tx.package.findFirst({
        where: {
          id: input.packageId,
          tenantId: existing.tenantId,
          active: true,
        },
      })
      if (!pkg) throw new Error('Package not found.')
      packageId = pkg.id
      partyType = pkg.partyTypes[0] ?? 'OPEN'
    }

    const timesOrLanesChanged =
      startTime.getTime() !== existing.startTime.getTime() ||
      endTime.getTime() !== existing.endTime.getTime() ||
      laneCount !== existing.laneCount

    await tx.booking.update({
      where: { id: input.bookingId },
      data: {
        startTime,
        endTime,
        bowlerCount,
        laneCount,
        packageId,
        partyType,
        ...(input.notes !== undefined
          ? { notes: input.notes?.trim() || null }
          : {}),
      },
    })

    if (timesOrLanesChanged) {
      await reassignBookingLanes(tx, {
        tenantId: existing.tenantId,
        bookingId: input.bookingId,
        laneCount,
        startTime,
        endTime,
      })
    }

    await tx.auditLog.create({
      data: {
        bookingId: input.bookingId,
        userId: user.id,
        action: 'BOOKING_MODIFIED',
        entityType: 'Booking',
        entityId: input.bookingId,
        details: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          bowlerCount,
          packageId,
        },
      },
    })
  },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

  revalidatePath('/staff')
  revalidatePath(`/staff/bookings/${input.bookingId}`)
}

export interface StaffPackageOption {
  id: string
  name: string
}

export async function getStaffPackageOptions(
  tenantId: string,
): Promise<StaffPackageOption[]> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)
  if (isDevWithoutDb()) {
    return [
      { id: 'pkg-classic', name: 'Classic Bowling' },
      { id: 'pkg-birthday', name: 'Birthday Party' },
    ]
  }
  const rows = await prisma.package.findMany({
    where: { tenantId, active: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  })
  return rows
}

export async function staffConfirmPendingPaymentAction(
  bookingId: string,
): Promise<void> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    console.log(`[staff] mock confirm pending payment ${bookingId}`)
    return
  }
  const tenantId = requireStaffTenantId(user)
  await prisma.$transaction(async (tx) => {
    const result = await tx.booking.updateMany({
      where: {
        id: bookingId,
        tenantId,
        status: 'PENDING_PAYMENT',
      },
      data: { status: 'CONFIRMED' },
    })
    if (result.count === 0) {
      throw new Error('Booking is not awaiting payment confirmation.')
    }
    await tx.auditLog.create({
      data: {
        bookingId,
        userId: user.id,
        action: 'BOOKING_PAYMENT_CONFIRMED',
        entityType: 'Booking',
        entityId: bookingId,
      },
    })
  })
  revalidatePath('/staff')
  revalidatePath(`/staff/bookings/${bookingId}`)
}

export async function markBookingCompletedAction(
  bookingId: string,
): Promise<void> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb()) return
  const tenantId = requireStaffTenantId(user)
  await prisma.$transaction(async (tx) => {
    const result = await tx.booking.updateMany({
      where: {
        id: bookingId,
        tenantId,
        status: 'CONFIRMED',
      },
      data: { status: 'COMPLETED' },
    })
    if (result.count === 0) {
      throw new Error('Booking not found or cannot be completed.')
    }
    await tx.auditLog.create({
      data: {
        bookingId,
        userId: user.id,
        action: 'BOOKING_COMPLETED',
        entityType: 'Booking',
        entityId: bookingId,
      },
    })
  })
  revalidatePath(`/staff/bookings/${bookingId}`)
  revalidatePath('/staff')
}

export async function autoCompletePastBookingsAction(
  tenantId: string,
): Promise<number> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)
  if (isDevWithoutDb()) return 0
  const now = new Date()
  const result = await prisma.booking.updateMany({
    where: {
      tenantId,
      status: 'CONFIRMED',
      endTime: { lt: now },
    },
    data: { status: 'COMPLETED' },
  })
  if (result.count > 0) {
    revalidatePath('/staff')
  }
  return result.count
}

export async function unblockLanes(blockId: string): Promise<void> {
  // Spec (.claude/staff/04_SCHEDULE.md): only Admin may delete lane blocks.
  const user = await requireRole('ADMIN')
  if (isDevWithoutDb()) return
  const tenantId = requireStaffTenantId(user)
  await prisma.$transaction(async (tx) => {
    const result = await tx.blockedSlot.deleteMany({
      where: { id: blockId, tenantId },
    })
    if (result.count === 0) {
      throw new Error('Block not found.')
    }
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'LANE_BLOCK_REMOVED',
        entityType: 'BlockedSlot',
        entityId: blockId,
      },
    })
  })
  revalidatePath('/staff/schedule')
}

// ── Helpers ───────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

interface BookingRow {
  id: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  bowlerCount: number
  laneCount: number
  customerName: string
  customerEmail: string
  customerPhone: string | null
  status: StaffBookingRow['status']
  source: StaffBookingRow['source']
  totalAmount: number
  isRefunded: boolean
  package: { name: string } | null
}

function toBookingRow(b: BookingRow): StaffBookingRow {
  return {
    id: b.id,
    confirmationCode: b.confirmationCode,
    startTime: b.startTime,
    endTime: b.endTime,
    bowlerCount: b.bowlerCount,
    laneCount: b.laneCount,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    status: b.status,
    source: b.source,
    packageName: b.package?.name ?? '',
    totalAmount: b.totalAmount,
    isRefunded: b.isRefunded,
  }
}

// ── Mocks (dev-without-db) ────────────────────────────────

function mockBookingsForRange(
  _tenantId: string,
  rangeStart: Date,
  _rangeEnd: Date,
): StaffBookingRow[] {
  const hourMs = 3_600_000
  const seeds: Array<Partial<StaffBookingRow> & { startHour: number }> = [
    {
      startHour: 17,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      bowlerCount: 6,
      packageName: 'Classic Bowling',
      source: 'ONLINE',
      totalAmount: 5400,
    },
    {
      startHour: 18,
      customerName: 'Alex Park',
      customerEmail: 'alex@example.com',
      bowlerCount: 4,
      packageName: 'Pay-Per-Game',
      source: 'ONLINE',
      totalAmount: 4800,
    },
    {
      startHour: 19,
      customerName: 'Riley Birthday Party',
      customerEmail: 'riley@example.com',
      bowlerCount: 12,
      packageName: 'Birthday Party',
      source: 'WALK_IN',
      totalAmount: 12000,
    },
    {
      startHour: 20,
      customerName: 'Morgan Lee',
      customerEmail: 'morgan@example.com',
      bowlerCount: 2,
      packageName: 'Classic Bowling',
      source: 'PHONE',
      totalAmount: 1800,
    },
    {
      startHour: 21,
      customerName: 'Cancelled Visitor',
      customerEmail: 'cx@example.com',
      bowlerCount: 3,
      packageName: 'Classic Bowling',
      source: 'ONLINE',
      totalAmount: 2700,
      isRefunded: true,
      status: 'CANCELLED',
    },
  ]

  return seeds.map((s, i) => {
    const start = new Date(rangeStart)
    start.setHours(s.startHour, 0, 0, 0)
    const end = new Date(start.getTime() + hourMs)
    return {
      id: `bk_mock_${i}`,
      confirmationCode: `MOCK${(i + 1).toString().padStart(2, '0')}`,
      startTime: start,
      endTime: end,
      bowlerCount: s.bowlerCount ?? 1,
      laneCount: getLaneCount(s.bowlerCount ?? 1),
      customerName: s.customerName ?? '',
      customerEmail: s.customerEmail ?? '',
      customerPhone: null,
      status: s.status ?? 'CONFIRMED',
      source: s.source ?? 'ONLINE',
      packageName: s.packageName ?? 'Classic Bowling',
      totalAmount: s.totalAmount ?? 0,
      isRefunded: s.isRefunded ?? false,
    }
  })
}

function mockBlocks(rangeStart: Date): BlockedSlotRow[] {
  const start = new Date(rangeStart)
  start.setHours(14, 0, 0, 0)
  const end = new Date(start)
  end.setHours(16)
  return [
    {
      id: 'block_mock_1',
      startTime: start,
      endTime: end,
      reason: 'League night setup',
      lanes: [5, 6, 7, 8],
    },
  ]
}

function mockCockpitSnapshot(_tenantId: string, now: Date): CockpitSnapshot {
  const totalLanes = 12
  const base = startOfDay(now)

  function at(hour: number, minute: number, durationMin: number): {
    start: Date
    end: Date
  } {
    const start = new Date(base)
    start.setHours(hour, minute, 0, 0)
    const end = new Date(start.getTime() + durationMin * 60_000)
    return { start, end }
  }

  function minutesAgo(min: number, durationMin: number): {
    start: Date
    end: Date
  } {
    const start = new Date(now.getTime() - min * 60_000)
    const end = new Date(start.getTime() + durationMin * 60_000)
    return { start, end }
  }

  const lee = at(12, 0, 90)
  const smith = at(12, 30, 60)
  const jordan = at(13, 0, 90)
  const lateRivera = minutesAgo(6, 120)
  const lateDavis = minutesAgo(21, 120)
  const brown = at(14, 15, 90)
  const sarah = at(14, 30, 120)
  const marcus = at(15, 0, 120)
  const taylor = at(15, 0, 90)
  const park = at(16, 0, 90)
  const acme = at(17, 0, 180)

  const bookings: StaffBookingRow[] = [
    {
      id: 'bk_mock_lee',
      confirmationCode: 'RZL4825',
      startTime: lee.start,
      endTime: lee.end,
      bowlerCount: 4,
      laneCount: 1,
      customerName: 'Lee Family',
      customerEmail: 'lee@example.com',
      customerPhone: null,
      status: 'COMPLETED',
      source: 'WALK_IN',
      packageName: 'Open Bowl',
      totalAmount: 3600,
      isRefunded: false,
    },
    {
      id: 'bk_mock_smith',
      confirmationCode: 'RZL4826',
      startTime: smith.start,
      endTime: smith.end,
      bowlerCount: 2,
      laneCount: 1,
      customerName: 'Sam Smith',
      customerEmail: 'smith@example.com',
      customerPhone: null,
      status: 'COMPLETED',
      source: 'ONLINE',
      packageName: 'Open Bowl',
      totalAmount: 1800,
      isRefunded: false,
    },
    {
      id: 'bk_mock_jordan',
      confirmationCode: 'RZL4828',
      startTime: jordan.start,
      endTime: jordan.end,
      bowlerCount: 4,
      laneCount: 1,
      customerName: 'Jordan Rivera',
      customerEmail: 'jordan@example.com',
      customerPhone: null,
      status: 'COMPLETED',
      source: 'WALK_IN',
      packageName: 'Open Bowl',
      totalAmount: 3600,
      isRefunded: false,
    },
    {
      id: 'bk_mock_rivera_late',
      confirmationCode: 'RZL4834',
      startTime: lateRivera.start,
      endTime: lateRivera.end,
      bowlerCount: 5,
      laneCount: 1,
      customerName: 'Rivera party',
      customerEmail: 'rivera@example.com',
      customerPhone: null,
      status: 'CONFIRMED',
      source: 'ONLINE',
      packageName: 'Open Bowl',
      totalAmount: 4500,
      isRefunded: false,
    },
    {
      id: 'bk_mock_davis',
      confirmationCode: 'RZL4827',
      startTime: lateDavis.start,
      endTime: lateDavis.end,
      bowlerCount: 4,
      laneCount: 1,
      customerName: 'Davis group',
      customerEmail: 'davis@example.com',
      customerPhone: null,
      status: 'CONFIRMED',
      source: 'ONLINE',
      packageName: 'Open Bowl',
      totalAmount: 3600,
      isRefunded: false,
    },
    {
      id: 'bk_mock_brown',
      confirmationCode: 'RZL4832',
      startTime: brown.start,
      endTime: brown.end,
      bowlerCount: 6,
      laneCount: 1,
      customerName: 'Alex Brown',
      customerEmail: 'brown@example.com',
      customerPhone: null,
      status: 'CONFIRMED',
      source: 'ONLINE',
      packageName: 'Birthday Party',
      totalAmount: 7200,
      isRefunded: false,
    },
    {
      id: 'bk_mock_sarah',
      confirmationCode: 'RZL4829',
      startTime: sarah.start,
      endTime: sarah.end,
      bowlerCount: 6,
      laneCount: 1,
      customerName: 'Sarah Johnson',
      customerEmail: 'sarah@example.com',
      customerPhone: '(803) 555-0147',
      status: 'CONFIRMED',
      source: 'ONLINE',
      packageName: 'Cosmic Bowl',
      totalAmount: 7200,
      isRefunded: false,
    },
    {
      id: 'bk_mock_marcus',
      confirmationCode: 'RZL4830',
      startTime: marcus.start,
      endTime: marcus.end,
      bowlerCount: 8,
      laneCount: 2,
      customerName: 'Marcus Williams',
      customerEmail: 'marcus@example.com',
      customerPhone: null,
      status: 'CONFIRMED',
      source: 'ONLINE',
      packageName: 'Birthday Party',
      totalAmount: 9600,
      isRefunded: false,
    },
    {
      id: 'bk_mock_taylor',
      confirmationCode: 'RZL4831',
      startTime: taylor.start,
      endTime: taylor.end,
      bowlerCount: 3,
      laneCount: 1,
      customerName: 'Taylor Chen',
      customerEmail: 'taylor@example.com',
      customerPhone: null,
      status: 'CONFIRMED',
      source: 'ONLINE',
      packageName: 'Open Bowl',
      totalAmount: 2700,
      isRefunded: false,
    },
    {
      id: 'bk_mock_park',
      confirmationCode: 'RZL4833',
      startTime: park.start,
      endTime: park.end,
      bowlerCount: 4,
      laneCount: 1,
      customerName: 'Jamie Park',
      customerEmail: 'park@example.com',
      customerPhone: null,
      status: 'CONFIRMED',
      source: 'PHONE',
      packageName: 'Open Bowl',
      totalAmount: 3600,
      isRefunded: false,
    },
    {
      id: 'bk_mock_acme',
      confirmationCode: 'RZL7741',
      startTime: acme.start,
      endTime: acme.end,
      bowlerCount: 24,
      laneCount: 4,
      customerName: 'Acme Corp',
      customerEmail: 'events@acme.example.com',
      customerPhone: '(803) 555-0193',
      status: 'CONFIRMED',
      source: 'PHONE',
      packageName: 'Corporate Bowl',
      totalAmount: 86400,
      isRefunded: false,
      paymentPending: true,
    },
  ]

  const laneAssignments = new Map<string, number[]>([
    ['bk_mock_lee', [8]],
    ['bk_mock_smith', [5]],
    ['bk_mock_jordan', [1, 3]],
    ['bk_mock_rivera_late', [3]],
    ['bk_mock_davis', [7]],
    ['bk_mock_brown', [8]],
    ['bk_mock_sarah', [2, 4]],
    ['bk_mock_marcus', [1, 2]],
    ['bk_mock_taylor', [5]],
    ['bk_mock_park', [7]],
    ['bk_mock_acme', [10, 11, 12]],
  ])

  const blockStart = new Date(base)
  blockStart.setHours(14, 0, 0, 0)
  const blockEnd = new Date(blockStart.getTime() + 4 * 3_600_000)
  const blocks: BlockedSlotRow[] = [
    {
      id: 'block_mock_lane6',
      startTime: blockStart,
      endTime: blockEnd,
      reason: 'Maintenance',
      lanes: [6],
    },
  ]

  const cockpitBookings = toCockpitBookings(bookings, laneAssignments, now)

  return {
    totalLanes,
    bookings: cockpitBookings,
    blocks,
    stats: buildCockpitStats(cockpitBookings, now),
    referenceNow: now.toISOString(),
    lanes: buildCockpitLanes(totalLanes, cockpitBookings, blocks, now),
  }
}

function mockScheduleMonth(
  _tenantId: string,
  year: number,
  month: number,
  daysInMonth: number,
): ScheduleMonthSummary {
  const totalLanes = 12
  const today = startOfDay(new Date())
  const days: ScheduleDaySummary[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = isoDateFromParts(year, month, day)
    const dayDate = startOfDay(new Date(`${dateISO}T00:00:00`))
    const isToday = dayDate.getTime() === today.getTime()
    const dayOfWeek = dayDate.getDay()
    const bookingCount =
      dayOfWeek === 0 || dayOfWeek === 6 ? (day % 3) + 2 : (day % 5) + 1
    const densityPercent = Math.min(
      100,
      Math.round((bookingCount * 2 * 100) / totalLanes),
    )
    let blockLevel: ScheduleBlockLevel = 'none'
    if (day === 8 || day === 17) blockLevel = 'partial'
    if (day === 17) blockLevel = 'full'

    days.push({
      dateISO,
      bookingCount: isToday ? 8 : bookingCount,
      densityPercent: isToday ? 45 : densityPercent,
      densityLevel: densityLevelFromPercent(isToday ? 45 : densityPercent),
      blockLevel,
    })
  }

  const blocks: BlockedSlotRow[] = []
  const blockDay = Math.min(10, daysInMonth)
  const blockStart = new Date(year, month, blockDay, 16, 0, 0, 0)
  const blockEnd = new Date(year, month, blockDay, 18, 0, 0, 0)
  blocks.push({
    id: 'block_mock_1',
    startTime: blockStart,
    endTime: blockEnd,
    reason: 'League night setup',
    lanes: [5, 6, 7, 8],
  })
  if (daysInMonth >= 17) {
    const fullStart = startOfDay(new Date(year, month, 17))
    const fullEnd = new Date(fullStart.getTime() + 86_400_000)
    blocks.push({
      id: 'block_mock_2',
      startTime: fullStart,
      endTime: fullEnd,
      reason: 'Private event',
      lanes: [],
    })
  }

  return { totalLanes, days, blocks }
}

function mockBookingDetail(bookingId: string): StaffBookingDetail {
  const rows = mockBookingsForRange('', startOfDay(new Date()), new Date())
  const base = rows.find((r) => r.id === bookingId) ?? rows[0]
  return {
    ...base,
    partyType: 'OPEN',
    notes: 'Mock booking for dev-without-db preview.',
    createdAt: new Date(),
    checkedInAt: null,
    shoeSizes: [],
    payment: {
      id: `pay_mock_${base.id}`,
      amount: base.totalAmount,
      status: base.source === 'WALK_IN' ? 'cash' : 'succeeded',
      stripePaymentIntentId: base.source === 'ONLINE' ? 'pi_mock_abc' : null,
      refundAmount: base.isRefunded ? base.totalAmount : null,
      refundStatus: base.isRefunded ? 'SUCCEEDED' : 'NONE',
      refundedAt: base.isRefunded ? new Date() : null,
    },
  }
}
