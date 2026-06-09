'use server'

// customer.ts — Public, anonymous-friendly server actions for the
// /find-my-booking customer-self-service flow.
//
// Auth model:
//   - These actions are PUBLIC. There is no Credentials sign-in for
//     customers in v1.
//   - The "auth" is possession of email + confirmation code. Both must
//     match exactly (case-insensitive email).
//   - Failures return a generic "not found" without revealing which half
//     was wrong, to defeat enumeration.
//
// Rate limiting: in-app backstop via assertPublicRateLimit (M12-M1) plus WAF
// at the edge — see `.claude/contracts/OPS.md` and RUNBOOK § Edge security.

import { revalidatePath } from 'next/cache'

import { Prisma } from '@prisma/client'

import { policySnapshotFromBooking, policySnapshotFromTenantRow } from '@/lib/booking-snapshots'
import { requireUser } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { sendBookingCancellation } from '@/lib/email'
import { reassignBookingLanes } from '@/lib/lane-assignment'
import {
  findOverlappingBlockedSlots,
  sumReservedLanesIncludingBlocks,
} from '@/lib/blocked-lanes'
import {
  CAPACITY_BOOKING_STATUSES,
  getLaneCount,
} from '@/lib/lane-logic'
import { assertPublicRateLimit } from '@/lib/rate-limit-request'
import { prisma } from '@/lib/prisma'
import { createRefund, isStripeMocked } from '@/lib/stripe'
import { assertBookingDurationWithinLimits } from '@/lib/tenant-config'
import { getTenant } from '@/lib/tenant'

// ── Shared types ──────────────────────────────────────────

export interface CustomerBookingDetail {
  id: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  bowlerCount: number
  laneCount: number
  totalAmount: number
  customerName: string
  customerEmail: string
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'HOLD' | 'PENDING_PAYMENT'
  isRefunded: boolean
  packageName: string
  /** Whether the booking is still cancellable per policy. */
  cancellable: boolean
  /** Refund amount (cents) the customer would receive if they cancel now. */
  refundIfCancelled: number
  /** Policy hours window for context in the UI. */
  policyWindowHours: number
  /** Policy refund percent for context. */
  policyRefundPercent: number
  /** True if the booking start is in the past. */
  isPast: boolean
  /** Within reschedule policy window. */
  reschedulable: boolean
  rescheduleWindowHours: number
  /** Persisted shoe sizes per bowler (empty when shoes included). */
  shoeSizes: string[]
}

// ── Lookup ────────────────────────────────────────────────

export interface LookupInput {
  email: string
  confirmationCode: string
}

export async function getBookingByLookup(
  input: LookupInput,
): Promise<CustomerBookingDetail | null> {
  await assertPublicRateLimit('find_booking')

  const email = input.email.trim().toLowerCase()
  const code = input.confirmationCode.trim().toUpperCase()
  if (!email || !code) return null

  if (isDevWithoutDb()) {
    if (code !== 'MOCK01' || email !== 'jane@example.com') return null
    return buildMockDetail()
  }

  const booking = await prisma.booking.findFirst({
    where: {
      confirmationCode: code,
      OR: [{ customerEmail: email }, { customerEmail: input.email.trim() }],
    },
    include: {
      package: { select: { name: true } },
      bowlers: { orderBy: { index: 'asc' } },
    },
  })
  if (!booking) return null
  return await decorate(booking)
}

// ── Cancel ────────────────────────────────────────────────

export interface CancelInput {
  email: string
  confirmationCode: string
}

export interface CancelResult {
  status: 'CANCELLED'
  refundAmountCents: number
  refundPending: boolean
  mocked: boolean
}

export async function cancelBookingAction(
  input: CancelInput,
): Promise<CancelResult> {
  const booking = await getBookingByLookup(input)
  if (!booking) {
    throw new Error('We could not find a booking matching that code and email.')
  }
  if (booking.status === 'CANCELLED' || booking.isRefunded) {
    throw new Error('This booking is already cancelled.')
  }
  if (booking.isPast) {
    throw new Error('Past bookings cannot be cancelled.')
  }

  if (isDevWithoutDb()) {
    return {
      status: 'CANCELLED',
      refundAmountCents: booking.refundIfCancelled,
      refundPending: booking.refundIfCancelled > 0,
      mocked: true,
    }
  }

  // Fetch the Payment row so we can look up the PaymentIntent for the refund.
  const payment = await prisma.payment.findUnique({
    where: { bookingId: booking.id },
  })

  const refundAmount = booking.refundIfCancelled
  const shouldRefund =
    refundAmount > 0 && payment?.stripePaymentIntentId != null

  let stripeRefund: Awaited<ReturnType<typeof createRefund>> | null = null
  if (shouldRefund && payment?.stripePaymentIntentId) {
    const alreadyRefunded = payment.refundAmount ?? 0
    stripeRefund = await createRefund({
      paymentIntentId: payment.stripePaymentIntentId,
      amountCents: refundAmount,
      reason: 'requested_by_customer',
      idempotencyKey: `customer-cancel:${booking.id}:${alreadyRefunded + refundAmount}`,
      metadata: {
        bookingId: booking.id,
        source: 'customer_self_service',
      },
    })
  }

  // Persist cancellation only after Stripe accepts the refund request.
  // The webhook (charge.refunded) is the sole writer of refundStatus = SUCCEEDED.
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        // isRefunded is set by the charge.refunded webhook for Stripe refunds.
        isRefunded: false,
        cancellationReason: 'CUSTOMER_REQUEST',
      },
    })
    if (shouldRefund && payment && stripeRefund) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          stripeRefundId: stripeRefund.id,
          refundStatus: 'PENDING',
          refundAmount,
        },
      })
    }
    await tx.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: null,
        action: 'BOOKING_CUSTOMER_CANCELLED',
        entityType: 'Booking',
        entityId: booking.id,
        details: {
          refundAmount,
          stripeRefundId: stripeRefund?.id ?? null,
          policyWindowHours: booking.policyWindowHours,
          policyRefundPercent: booking.policyRefundPercent,
          sourceEmail: input.email.trim(),
        },
      },
    })
  })

  const refundPending = stripeRefund != null

  // Send the cancellation email (best-effort; logs in dev mode).
  await sendBookingCancellation({
    customerEmail: booking.customerEmail,
    customerName: booking.customerName,
    confirmationCode: booking.confirmationCode,
    startTime: booking.startTime,
    refundAmountCents: refundAmount,
    refundPending,
  }).catch((err) => {
    console.error('[customer.cancel] email failed:', err)
  })

  revalidatePath(`/find-my-booking/${booking.confirmationCode}`)
  return {
    status: 'CANCELLED',
    refundAmountCents: refundAmount,
    refundPending,
    mocked: isStripeMocked(),
  }
}

// ── Helpers ───────────────────────────────────────────────

interface BookingRecord {
  id: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  bowlerCount: number
  laneCount: number
  totalAmount: number
  customerName: string
  customerEmail: string
  status: CustomerBookingDetail['status']
  isRefunded: boolean
  cancellationWindowHoursSnapshot: number | null
  rescheduleWindowHoursSnapshot: number | null
  bowlersPerLaneSnapshot: number | null
  cancellationRefundPercentSnapshot: number | null
  package: { name: string } | null
  bowlers?: Array<{ index: number; shoeSize: string | null }>
}

async function decorate(b: BookingRecord): Promise<CustomerBookingDetail> {
  const tenant = await getTenant()
  const tenantPolicy = policySnapshotFromTenantRow({
    cancellationWindowHours: tenant.cancellationWindowHours,
    rescheduleWindowHours: tenant.rescheduleWindowHours,
    bowlersPerLane: tenant.bowlersPerLane,
    cancellationRefundPercent: tenant.cancellationRefundPercent,
  })
  const policy = policySnapshotFromBooking(b, tenantPolicy)
  const now = new Date()
  const cancelCutoff = new Date(
    b.startTime.getTime() - policy.cancellationWindowHours * 3_600_000,
  )
  const rescheduleCutoff = new Date(
    b.startTime.getTime() - policy.rescheduleWindowHours * 3_600_000,
  )
  const isPast = b.startTime.getTime() <= now.getTime()
  const withinCancelWindow = now <= cancelCutoff
  const withinRescheduleWindow = now <= rescheduleCutoff
  const cancellable =
    !isPast &&
    b.status === 'CONFIRMED' &&
    !b.isRefunded &&
    withinCancelWindow
  const reschedulable =
    !isPast &&
    b.status === 'CONFIRMED' &&
    !b.isRefunded &&
    withinRescheduleWindow
  const     refundIfCancelled =
    cancellable
      ? Math.floor(
          (b.totalAmount * policy.cancellationRefundPercent) / 100,
        )
      : 0
  return {
    id: b.id,
    confirmationCode: b.confirmationCode,
    startTime: b.startTime,
    endTime: b.endTime,
    bowlerCount: b.bowlerCount,
    laneCount: b.laneCount,
    totalAmount: b.totalAmount,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    status: b.status,
    isRefunded: b.isRefunded,
    packageName: b.package?.name ?? '',
    cancellable,
    refundIfCancelled,
    policyWindowHours: policy.cancellationWindowHours,
    policyRefundPercent: policy.cancellationRefundPercent,
    isPast,
    reschedulable,
    rescheduleWindowHours: policy.rescheduleWindowHours,
    shoeSizes:
      b.bowlers?.map((row) => row.shoeSize).filter((s): s is string => s != null) ??
      [],
  }
}

function buildMockDetail(): CustomerBookingDetail {
  const start = new Date(Date.now() + 48 * 3_600_000)
  const end = new Date(start.getTime() + 3_600_000)
  return {
    id: 'bk_mock_lookup',
    confirmationCode: 'MOCK01',
    startTime: start,
    endTime: end,
    bowlerCount: 4,
    laneCount: 1,
    totalAmount: 4500,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    status: 'CONFIRMED',
    isRefunded: false,
    packageName: 'Classic Bowling',
    cancellable: true,
    refundIfCancelled: 4500,
    policyWindowHours: 24,
    policyRefundPercent: 100,
    isPast: false,
    reschedulable: true,
    rescheduleWindowHours: 24,
    shoeSizes: [],
  }
}


export async function cancelDashboardBookingAction(
  bookingId: string,
): Promise<CancelResult> {
  const user = await requireUser()
  if (user.role !== 'CUSTOMER') {
    throw new Error('Only customer accounts can cancel from the dashboard.')
  }
  const email = user.email?.trim().toLowerCase()
  if (!email) throw new Error('Account email is required.')

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      OR: [{ userId: user.id }, { customerEmail: email }],
    },
    select: { confirmationCode: true, customerEmail: true },
  })
  if (!booking) throw new Error('Booking not found.')

  return cancelBookingAction({
    email: booking.customerEmail,
    confirmationCode: booking.confirmationCode,
  })
}

export async function rescheduleDashboardBookingAction(input: {
  bookingId: string
  startTime: Date
  endTime: Date
}): Promise<void> {
  const user = await requireUser()
  if (user.role !== 'CUSTOMER') {
    throw new Error('Only customer accounts can reschedule from the dashboard.')
  }
  if (input.endTime <= input.startTime) {
    throw new Error('End time must be after start time.')
  }

  const email = user.email?.trim().toLowerCase()
  const booking = await prisma.booking.findFirst({
    where: {
      id: input.bookingId,
      OR: [
        { userId: user.id },
        ...(email ? [{ customerEmail: email }] : []),
      ],
    },
  })
  if (!booking) throw new Error('Booking not found.')
  if (
    booking.status !== 'CONFIRMED' &&
    booking.status !== 'PENDING_PAYMENT'
  ) {
    throw new Error('Only active bookings can be rescheduled.')
  }

  const tenant = await getTenant()
  const policy = policySnapshotFromBooking(booking, policySnapshotFromTenantRow(tenant))
  const now = new Date()
  const cutoff = new Date(
    booking.startTime.getTime() - policy.rescheduleWindowHours * 3_600_000,
  )
  if (now > cutoff) {
    throw new Error('Reschedule window has passed for this booking.')
  }

  assertBookingDurationWithinLimits(tenant, input.startTime, input.endTime)

  const bowlersPerLane =
    booking.bowlersPerLaneSnapshot ?? tenant.bowlersPerLane
  const laneCount = getLaneCount(booking.bowlerCount, bowlersPerLane)

  await prisma.$transaction(
    async (tx) => {
      const live = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          OR: [
            { userId: user.id },
            ...(email ? [{ customerEmail: email }] : []),
          ],
        },
      })
      if (!live) throw new Error('Booking not found.')
      if (
        live.status !== 'CONFIRMED' &&
        live.status !== 'PENDING_PAYMENT'
      ) {
        throw new Error('Only active bookings can be rescheduled.')
      }

      const overlapping = await tx.booking.findMany({
        where: {
          tenantId: live.tenantId,
          status: { in: [...CAPACITY_BOOKING_STATUSES] },
          id: { not: live.id },
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
        select: { startTime: true, endTime: true, laneCount: true },
      })
      const activeHolds = await tx.bookingHold.findMany({
        where: {
          tenantId: live.tenantId,
          expiresAt: { gt: now },
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
        select: { startTime: true, endTime: true, laneCount: true },
      })
      const totalLanes = await tx.lane.count({
        where: { tenantId: live.tenantId, active: true },
      })
      const blocks = await findOverlappingBlockedSlots(
        tx,
        live.tenantId,
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

      await tx.booking.update({
        where: { id: live.id },
        data: {
          startTime: input.startTime,
          endTime: input.endTime,
          laneCount,
        },
      })

      await reassignBookingLanes(tx, {
        tenantId: live.tenantId,
        bookingId: live.id,
        laneCount,
        startTime: input.startTime,
        endTime: input.endTime,
      })
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )

  revalidatePath('/dashboard')
}
