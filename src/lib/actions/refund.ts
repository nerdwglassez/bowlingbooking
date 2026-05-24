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
  if (booking.isRefunded) {
    throw new Error('Booking already fully refunded')
  }
  const payment = booking.payment
  if (!payment || !payment.stripePaymentIntentId) {
    throw new Error('No captured payment to refund for this booking')
  }
  if (payment.refundStatus === 'PENDING') {
    throw new Error('Refund already in progress for this booking')
  }
  if (payment.refundStatus === 'SUCCEEDED') {
    throw new Error('Booking already has a settled refund')
  }

  const amount =
    input.amountCents == null || input.amountCents <= 0
      ? payment.amount
      : Math.min(input.amountCents, payment.amount)

  const refund = await createRefund({
    paymentIntentId: payment.stripePaymentIntentId,
    amountCents: amount,
    reason: input.reason,
    idempotencyKey: `booking-refund:${booking.id}`,
    metadata: {
      bookingId: booking.id,
      requestedBy: user.id,
    },
  })

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        stripeRefundId: refund.id,
        refundAmount: amount,
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
