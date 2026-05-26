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

import { isDevWithoutDb } from '@/lib/env'
import { sendBookingCancellation } from '@/lib/email'
import { assertPublicRateLimit } from '@/lib/rate-limit-request'
import { prisma } from '@/lib/prisma'
import { createRefund, isStripeMocked } from '@/lib/stripe'
import { getCancellationPolicy, getTenant } from '@/lib/tenant'

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
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'HOLD'
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
      // Postgres is case-sensitive by default; the seed always lowercases
      // customer_email, but production data may not. Compare both.
      OR: [{ customerEmail: email }, { customerEmail: input.email.trim() }],
    },
    include: { package: { select: { name: true } } },
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

  let refundPending = false
  if (shouldRefund && payment?.stripePaymentIntentId) {
    await createRefund({
      paymentIntentId: payment.stripePaymentIntentId,
      amountCents: refundAmount,
      reason: 'requested_by_customer',
      metadata: { source: 'customer_self_service' },
    })
    refundPending = true
  }

  // Update the booking + payment + audit in a transaction. The webhook is the
  // sole writer of Booking.isRefunded=true for Stripe payments.
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        isRefunded: false,
      },
    })
    if (shouldRefund && payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
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
          policyWindowHours: booking.policyWindowHours,
          policyRefundPercent: booking.policyRefundPercent,
          sourceEmail: input.email.trim(),
        },
      },
    })
  })

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
  package: { name: string } | null
}

async function decorate(b: BookingRecord): Promise<CustomerBookingDetail> {
  const tenant = await getTenant()
  const policy = getCancellationPolicy(tenant)
  const now = new Date()
  const cutoff = new Date(
    b.startTime.getTime() - policy.windowHours * 3_600_000,
  )
  const isPast = b.startTime.getTime() <= now.getTime()
  const withinWindow = now <= cutoff
  const cancellable =
    !isPast && b.status !== 'CANCELLED' && !b.isRefunded
  const refundIfCancelled =
    cancellable && withinWindow
      ? Math.floor((b.totalAmount * policy.refundPercent) / 100)
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
    policyWindowHours: policy.windowHours,
    policyRefundPercent: policy.refundPercent,
    isPast,
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
  }
}
