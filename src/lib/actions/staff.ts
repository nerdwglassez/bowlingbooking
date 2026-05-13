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

import { requireRole } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { getLaneCount } from '@/lib/lane-logic'
import { prisma } from '@/lib/prisma'

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
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'HOLD'
  source: 'ONLINE' | 'WALK_IN' | 'PHONE'
  packageName: string
  totalAmount: number
  isRefunded: boolean
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
}

export interface BlockedSlotRow {
  id: string
  startTime: Date
  endTime: Date
  reason: string | null
  /** Lane numbers blocked; empty array = all lanes. */
  lanes: number[]
}

// ── Cockpit: today's bookings ─────────────────────────────

export async function getTodayBookings(
  tenantId: string,
): Promise<StaffBookingRow[]> {
  await requireRole('STAFF', 'MANAGER', 'ADMIN')
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

// ── Schedule: bookings + blocks for a specific date ───────

export interface ScheduleDay {
  bookings: StaffBookingRow[]
  blocks: BlockedSlotRow[]
}

export async function getScheduleForDate(
  tenantId: string,
  dateISO: string,
): Promise<ScheduleDay> {
  await requireRole('STAFF', 'MANAGER', 'ADMIN')
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
  await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockBookingDetail(bookingId)
  }
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      package: { select: { name: true } },
      payment: true,
    },
  })
  if (!booking) return null
  return {
    ...toBookingRow(booking),
    partyType: booking.partyType,
    notes: booking.notes,
    createdAt: booking.createdAt,
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
  packageId: string
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

  const confirmationCode = generateConfirmationCode()
  const laneCount = getLaneCount(input.bowlerCount)

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        tenantId: input.tenantId,
        userId: user.id,
        confirmationCode,
        partyType: input.partyType,
        bowlerCount: input.bowlerCount,
        laneCount,
        startTime: input.startTime,
        endTime: input.endTime,
        packageId: input.packageId,
        status: 'CONFIRMED',
        source: 'WALK_IN',
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone ?? null,
        totalAmount: input.totalAmount,
        notes: input.notes ?? null,
        isRefunded: false,
      },
    })

    if (input.totalAmount > 0) {
      await tx.payment.create({
        data: {
          bookingId: created.id,
          amount: input.totalAmount,
          status: input.paymentMethod,
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
          source: 'WALK_IN',
        },
      },
    })

    return created
  })

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
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (input.endTime <= input.startTime) {
    throw new Error('blockLanes: endTime must be after startTime')
  }
  if (isDevWithoutDb()) {
    return { blockId: `block_mock_${Date.now()}`, mocked: true }
  }

  const block = await prisma.$transaction(async (tx) => {
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
        userId: user.id,
        action: 'LANE_BLOCK_CREATED',
        entityType: 'BlockedSlot',
        entityId: created.id,
        details: { lanes: input.lanes, reason: input.reason ?? null },
      },
    })
    return created
  })

  revalidatePath('/staff/schedule')
  return { blockId: block.id, mocked: false }
}

export async function unblockLanes(blockId: string): Promise<void> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb() || !blockId.startsWith('block_')) return
  await prisma.$transaction(async (tx) => {
    await tx.blockedSlot.deleteMany({ where: { id: blockId } })
    await tx.auditLog.create({
      data: {
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

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
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
      reason: 'Lane maintenance',
      lanes: [3, 4],
    },
  ]
}

function mockBookingDetail(bookingId: string): StaffBookingDetail {
  const rows = mockBookingsForRange('', startOfDay(new Date()), new Date())
  const base = rows.find((r) => r.id === bookingId) ?? rows[0]
  return {
    ...base,
    partyType: 'OPEN',
    notes: 'Mock booking for dev-without-db preview.',
    createdAt: new Date(),
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
