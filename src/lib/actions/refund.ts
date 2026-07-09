'use server'

// refund.ts — Manager/Admin-gated refund flow.
//
// Architecture (decision 4 in Phase 7 plan):
//   1. The server action calls Stripe to create the refund and updates
//      Payment.refundStatus to PENDING + writes an AuditLog row, atomically.
//      It does NOT touch Booking.isRefunded.
//   2. Stripe settles the refund asynchronously. The webhook handler
//      (`charge.refunded`) is the SOLE place that flips refundStatus to
//      SUCCEEDED / FAILED and sets Booking.isRefunded.
//   3. The UI surfaces "Refund pending" until the webhook clears it.
//
// This keeps the user-facing action immediate (one click, one Stripe call)
// while keeping our state honest about Stripe's async settlement model.
//
// Authorization: STAFF cannot refund (per BOOKING_DOMAIN.md). MANAGER and
// ADMIN can. `requireRole` redirects unauthenticated users to /signin and
// throws for authenticated-but-underprivileged users.

import { revalidatePath } from 'next/cache'

import { requireRole } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { createRefund } from '@/lib/stripe'

export interface RefundBookingInput {
  bookingId: string
  /** Cents. Omit or set to null to issue a full refund. */
  amountCents?: number | null
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  notes?: string
}

export interface RefundBookingResult {
  refundId: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  amountCents: number
  mocked: boolean
}

const REFUND_AUDIT_ACTION = 'BOOKING_REFUND_REQUESTED'
const MANUAL_REFUND_AUDIT_ACTION = 'BOOKING_MANUAL_REFUND'

export interface ManualRefundBookingInput {
  bookingId: string
  /** Cents. Must be > 0 and not more than the remaining refundable balance. */
  amountCents: number
  method: 'cash' | 'check' | 'comp' | 'other'
  notes?: string
}

export interface ManualRefundBookingResult {
  amountCents: number
  method: string
  mocked: boolean
}

/**
 * Records a cash-at-counter / non-Stripe refund for walk-ins. Mutually
 * exclusive with `refundBookingAction` (Stripe). MANAGER+ only.
 */
export async function manualRefundBookingAction(
  input: ManualRefundBookingInput,
): Promise<ManualRefundBookingResult> {
  const user = await requireRole('MANAGER', 'ADMIN')

  if (isDevWithoutDb()) {
    return {
      amountCents: input.amountCents,
      method: input.method,
      mocked: true,
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { payment: true },
  })
  if (!booking) throw new Error('Booking not found')
  if (!user.tenantId || booking.tenantId !== user.tenantId) {
    throw new Error('Booking not found')
  }
  if (booking.isRefunded) {
    throw new Error('Booking already fully refunded')
  }
  const payment = booking.payment
  if (!payment) {
    throw new Error('No payment recorded for this booking')
  }
  if (payment.stripePaymentIntentId) {
    throw new Error('Use the Stripe refund flow for this booking')
  }
  if (payment.refundStatus === 'PENDING') {
    throw new Error('Refund already in progress for this booking')
  }

  const collected = payment.amount
  const alreadyRefunded = payment.refundAmount ?? 0
  const remaining = collected - alreadyRefunded
  if (remaining <= 0) {
    throw new Error('Booking already fully refunded')
  }

  if (!Number.isFinite(input.amountCents) || input.amountCents < 1) {
    throw new Error('Refund amount must be at least 1 cent')
  }
  if (input.amountCents > remaining) {
    throw new Error(
      `Refund amount must be between 1 and ${remaining} cents`,
    )
  }

  const newRefundTotal = alreadyRefunded + input.amountCents
  const isFullRefund = newRefundTotal >= collected

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        refundAmount: newRefundTotal,
        refundStatus: 'SUCCEEDED',
        refundReason: input.notes ?? input.method,
        refundedBy: user.id,
        status: 'refunded_manual',
      },
    })
    if (isFullRefund) {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          isRefunded: true,
          ...(booking.status !== 'CANCELLED'
            ? { status: 'CANCELLED' }
            : {}),
        },
      })
    }
    await tx.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        action: MANUAL_REFUND_AUDIT_ACTION,
        entityType: 'Booking',
        entityId: booking.id,
        details: {
          method: input.method,
          amount: input.amountCents,
          notes: input.notes ?? null,
        },
      },
    })
  })

  revalidatePath(`/staff/bookings/${booking.id}`)
  revalidatePath('/staff')

  return {
    amountCents: input.amountCents,
    method: input.method,
    mocked: false,
  }
}

export async function refundBookingAction(
  input: RefundBookingInput,
): Promise<RefundBookingResult> {
  const user = await requireRole('MANAGER', 'ADMIN')

  if (isDevWithoutDb()) {
    return {
      refundId: `re_mock_${Date.now()}`,
      status: 'PENDING',
      amountCents: input.amountCents ?? 0,
      mocked: true,
    }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { payment: true },
  })
  if (!booking) throw new Error('Booking not found')
  if (!user.tenantId || booking.tenantId !== user.tenantId) {
    throw new Error('Booking not found')
  }
  const payment = booking.payment
  if (!payment || !payment.stripePaymentIntentId) {
    throw new Error('No captured payment to refund for this booking')
  }
  if (payment.refundStatus === 'PENDING') {
    throw new Error('Refund already in progress for this booking')
  }

  const alreadyRefunded = payment.refundAmount ?? 0
  const remaining = payment.amount - alreadyRefunded
  if (remaining <= 0 || booking.isRefunded) {
    throw new Error('Booking already fully refunded')
  }

  const amount =
    input.amountCents == null || input.amountCents <= 0
      ? remaining
      : Math.min(input.amountCents, remaining)

  if (amount < 1) {
    throw new Error('Refund amount must be at least 1 cent')
  }

  const refund = await createRefund({
    paymentIntentId: payment.stripePaymentIntentId,
    amountCents: amount,
    reason: input.reason,
    idempotencyKey: `booking-refund:${booking.id}:${alreadyRefunded + amount}`,
    metadata: {
      bookingId: booking.id,
      requestedBy: user.id,
      cumulativeRefundAmount: String(alreadyRefunded + amount),
    },
  })

  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: {
        id: payment.id,
        NOT: {
          refundStatus: 'SUCCEEDED',
          refundAmount: { gte: alreadyRefunded + amount },
        },
      },
      data: {
        stripeRefundId: refund.id,
        refundAmount: alreadyRefunded + amount,
        refundStatus: 'PENDING',
        refundReason: input.notes ?? input.reason ?? null,
        refundedBy: user.id,
      },
    })
    await tx.auditLog.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        action: REFUND_AUDIT_ACTION,
        entityType: 'Booking',
        entityId: booking.id,
        details: {
          stripeRefundId: refund.id,
          amount,
          reason: input.reason ?? null,
          notes: input.notes ?? null,
        },
      },
    })
  })

  revalidatePath(`/admin/bookings/${booking.id}`)
  revalidatePath('/admin/bookings')

  return {
    refundId: refund.id,
    status: 'PENDING',
    amountCents: amount,
    mocked: refund.mocked,
  }
}
