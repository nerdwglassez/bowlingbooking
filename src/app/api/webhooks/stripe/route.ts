// Stripe webhook handler.
//
// Responsibilities (in order):
//   1. Verify the Stripe-Signature header against STRIPE_WEBHOOK_SECRET.
//   2. Insert the event into the StripeEvent table for idempotency. A unique
//      conflict on `id` means we've already processed this event — return
//      200 without re-running side effects.
//   3. Switch on event type:
//        - payment_intent.succeeded → create Booking from the intent's
//          metadata, delete the matching BookingHold, send confirmation email.
//        - charge.refunded / refund.updated → reconcile Payment.refundStatus
//          and Booking.isRefunded.
//        - other events → log + ignore.
//   4. Always respond 200 quickly. Stripe retries on non-2xx for hours;
//      put expensive work in background jobs (none for v1).
//
// Dev-without-Stripe: if STRIPE_WEBHOOK_SECRET is unset and NODE_ENV !==
// 'production', the signature check short-circuits and we parse the body
// as plain JSON. This is what tests use.

import { NextResponse, type NextRequest } from 'next/server'

import { sendBookingConfirmation } from '@/lib/email'
import { isDevWithoutDb } from '@/lib/env'
import { getLaneCount } from '@/lib/lane-logic'
import { prisma } from '@/lib/prisma'
import { constructWebhookEvent, type Stripe } from '@/lib/stripe'
import { getTenant } from '@/lib/tenant'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface BookingMetadata {
  holdId: string
  tenantId: string
  packageId: string
  partyType: 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'
  bowlerCount: number
  startTime: Date
  endTime: Date
  customerName: string
  customerEmail: string
  customerPhone: string
}

const PARTY_TYPES = new Set(['OPEN', 'BIRTHDAY', 'CORPORATE', 'COSMIC'])
const BOOKING_FINALIZE_MAX_RETRIES = 3
const SLOT_UNAVAILABLE_MESSAGE = 'Paid booking no longer has lane capacity.'

interface LaneReservation {
  startTime: Date
  endTime: Date
  laneCount: number
}

function reservedLaneCount(
  reservations: LaneReservation[],
  startTime: Date,
  endTime: Date,
): number {
  return reservations
    .filter((reservation) => {
      return reservation.startTime < endTime && reservation.endTime > startTime
    })
    .reduce((acc, reservation) => acc + reservation.laneCount, 0)
}

function isSerializableConflict(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2034'
  )
}

function parseBookingMetadata(
  raw: Record<string, string> | null | undefined,
): BookingMetadata | null {
  if (!raw) return null
  const partyType = raw.partyType
  if (!PARTY_TYPES.has(partyType)) return null
  const bowlerCount = Number.parseInt(raw.bowlerCount ?? '', 10)
  if (!Number.isFinite(bowlerCount) || bowlerCount < 1) return null
  const startTime = new Date(raw.startTime ?? '')
  const endTime = new Date(raw.endTime ?? '')
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return null
  }
  if (!raw.tenantId || !raw.packageId || !raw.holdId) return null
  return {
    holdId: raw.holdId,
    tenantId: raw.tenantId,
    packageId: raw.packageId,
    partyType: partyType as BookingMetadata['partyType'],
    bowlerCount,
    startTime,
    endTime,
    customerName: raw.customerName ?? '',
    customerEmail: raw.customerEmail ?? '',
    customerPhone: raw.customerPhone ?? '',
  }
}

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

async function recordStripeEvent(event: Stripe.Event): Promise<boolean> {
  try {
    await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        payload: event as unknown as object,
      },
    })
    return true
  } catch (err) {
    // Unique constraint violation = already processed
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      return false
    }
    throw err
  }
}

async function handlePaymentIntentSucceeded(
  intent: Stripe.PaymentIntent,
): Promise<void> {
  const metadata = parseBookingMetadata(
    intent.metadata as Record<string, string> | null,
  )
  if (!metadata) {
    console.warn(
      `[stripe-webhook] payment_intent.succeeded missing/invalid metadata: ${intent.id}`,
    )
    return
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: intent.id },
  })
  if (existingPayment) {
    return
  }

  const confirmationCode = generateConfirmationCode()
  const laneCount = getLaneCount(metadata.bowlerCount)

  let booking:
    | {
        confirmationCode: string
        startTime: Date
        endTime: Date
        laneCount: number
        bowlerCount: number
        totalAmount: number
      }
    | null = null

  for (let attempt = 0; attempt < BOOKING_FINALIZE_MAX_RETRIES; attempt++) {
    try {
      booking = await prisma.$transaction(
        async (tx) => {
          const now = new Date()
          await tx.bookingHold.deleteMany({
            where: {
              tenantId: metadata.tenantId,
              expiresAt: { lt: now },
            },
          })

          const liveHold = await tx.bookingHold.findUnique({
            where: { id: metadata.holdId },
          })
          if (
            liveHold &&
            (liveHold.tenantId !== metadata.tenantId ||
              liveHold.bowlerCount !== metadata.bowlerCount ||
              liveHold.startTime.getTime() !== metadata.startTime.getTime() ||
              liveHold.endTime.getTime() !== metadata.endTime.getTime())
          ) {
            throw new Error('Booking hold no longer matches paid intent.')
          }

          const totalLanes = await tx.lane.count({
            where: { tenantId: metadata.tenantId, active: true },
          })
          const confirmed = await tx.booking.findMany({
            where: {
              tenantId: metadata.tenantId,
              status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
              startTime: { lt: metadata.endTime },
              endTime: { gt: metadata.startTime },
            },
            select: { startTime: true, endTime: true, laneCount: true },
          })
          const held = await tx.bookingHold.findMany({
            where: {
              tenantId: metadata.tenantId,
              id: { not: metadata.holdId },
              expiresAt: { gt: now },
              startTime: { lt: metadata.endTime },
              endTime: { gt: metadata.startTime },
            },
            select: { startTime: true, endTime: true, laneCount: true },
          })

          const reserved = reservedLaneCount(
            [...confirmed, ...held],
            metadata.startTime,
            metadata.endTime,
          )
          if (totalLanes - reserved < laneCount) {
            throw new Error(SLOT_UNAVAILABLE_MESSAGE)
          }

          const created = await tx.booking.create({
            data: {
              tenantId: metadata.tenantId,
              confirmationCode,
              partyType: metadata.partyType,
              bowlerCount: metadata.bowlerCount,
              laneCount,
              startTime: metadata.startTime,
              endTime: metadata.endTime,
              packageId: metadata.packageId,
              status: 'CONFIRMED',
              source: 'ONLINE',
              customerName: metadata.customerName,
              customerEmail: metadata.customerEmail,
              customerPhone: metadata.customerPhone || null,
              totalAmount: intent.amount,
              isRefunded: false,
            },
          })

          await tx.payment.create({
            data: {
              bookingId: created.id,
              stripePaymentIntentId: intent.id,
              amount: intent.amount,
              status: intent.status,
            },
          })

          await tx.bookingHold.deleteMany({ where: { id: metadata.holdId } })

          return created
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      break
    } catch (err) {
      if (
        isSerializableConflict(err) &&
        attempt < BOOKING_FINALIZE_MAX_RETRIES - 1
      ) {
        continue
      }
      throw err
    }
  }

  if (!booking) {
    throw new Error(SLOT_UNAVAILABLE_MESSAGE)
  }

  if (metadata.customerEmail) {
    try {
      const tenant = await getTenant()
      await sendBookingConfirmation({
        to: metadata.customerEmail,
        customerName: metadata.customerName || 'Bowler',
        confirmationCode: booking.confirmationCode,
        startTime: booking.startTime,
        endTime: booking.endTime,
        laneCount: booking.laneCount,
        bowlerCount: booking.bowlerCount,
        packageName: tenant.name,
        totalCents: booking.totalAmount,
        venueName: tenant.name,
        venueAddress: tenant.address,
        venuePhone: tenant.phone,
      })
    } catch (err) {
      console.error('[stripe-webhook] confirmation email failed:', err)
    }
  }
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const intentId =
    typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id
  if (!intentId) return

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: intentId },
  })
  if (!payment) return

  const totalRefunded = charge.amount_refunded ?? 0
  const succeeded = (charge.refunded ?? false) && totalRefunded > 0

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        refundAmount: totalRefunded,
        refundStatus: succeeded ? 'SUCCEEDED' : 'FAILED',
        refundedAt: succeeded ? new Date() : null,
      },
    })
    if (succeeded) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { isRefunded: true, status: 'CANCELLED' },
      })
    }
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

  let event: Stripe.Event | null
  try {
    event = constructWebhookEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err)
    return NextResponse.json(
      { error: 'invalid-signature' },
      { status: 400 },
    )
  }
  if (!event) {
    return NextResponse.json({ error: 'no-event' }, { status: 400 })
  }

  if (isDevWithoutDb()) {
    console.log(`[stripe-webhook] dev-without-db: ignoring ${event.type}`)
    return NextResponse.json({ received: true, mocked: true })
  }

  const fresh = await recordStripeEvent(event)
  if (!fresh) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        )
        break
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break
      default:
        console.log(`[stripe-webhook] ignored event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}:`, err)
    try {
      await prisma.stripeEvent.deleteMany({ where: { id: event.id } })
    } catch (cleanupErr) {
      console.error(
        `[stripe-webhook] failed to clear event marker for ${event.id}:`,
        cleanupErr,
      )
    }
    return NextResponse.json(
      { error: 'handler-error' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
