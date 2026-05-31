// Stripe webhook handler.
//
// Responsibilities (in order):
//   1. Verify the Stripe-Signature header against STRIPE_WEBHOOK_SECRET.
//   2. Insert the event into the StripeEvent table for idempotency. A unique
//      conflict on `id` means we've already processed this event successfully —
//      return 200 without re-running side effects.
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

import { generateConfirmationCode } from '@/lib/booking-codes'
import {
  parseOptionalAddonIds,
  parseShoeSelections,
} from '@/lib/booking-metadata'
import { policySnapshotFromTenantRow } from '@/lib/booking-snapshots'
import { sendBookingConfirmation } from '@/lib/email'
import { isDevWithoutDb } from '@/lib/env'
import { assignBookingLanes } from '@/lib/lane-assignment'
import { getLaneCount, sumOverlappingLaneCount } from '@/lib/lane-logic'
import {
  isSerializableConflict,
  isUniqueConstraintOnField,
} from '@/lib/prisma-errors'
import { prisma } from '@/lib/prisma'
import { constructWebhookEvent, createRefund, type Stripe } from '@/lib/stripe'
import { getTenant } from '@/lib/tenant'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildManageUrl(confirmationCode: string, email: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '')
  return `${base}/find-my-booking/${confirmationCode}?email=${encodeURIComponent(email)}`
}

function buildIcsUrl(confirmationCode: string, email: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '')
  return `${base}/api/bookings/${encodeURIComponent(confirmationCode)}/ics?email=${encodeURIComponent(email)}`
}

interface BookingMetadata {
  holdId: string
  tenantId: string
  packageId: string
  partyType: 'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'
  bowlerCount: number
  bowlersPerLane: number
  startTime: Date
  endTime: Date
  customerName: string
  customerEmail: string
  customerPhone: string
}

const PARTY_TYPES = new Set(['OPEN', 'BIRTHDAY', 'CORPORATE', 'COSMIC'])
const BOOKING_FINALIZE_MAX_RETRIES = 3
const SLOT_UNAVAILABLE_MESSAGE = 'Paid booking no longer has lane capacity.'

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
  const bowlersPerLane = Number.parseInt(raw.bowlersPerLane ?? '6', 10)
  return {
    holdId: raw.holdId,
    tenantId: raw.tenantId,
    packageId: raw.packageId,
    partyType: partyType as BookingMetadata['partyType'],
    bowlerCount,
    bowlersPerLane:
      Number.isFinite(bowlersPerLane) && bowlersPerLane >= 1
        ? bowlersPerLane
        : 6,
    startTime,
    endTime,
    customerName: raw.customerName ?? '',
    customerEmail: raw.customerEmail ?? '',
    customerPhone: raw.customerPhone ?? '',
  }
}

function parsePromoFromIntentMetadata(
  raw: Record<string, string> | null | undefined,
): { promoCode: string | null; discountCents: number } {
  if (!raw) return { promoCode: null, discountCents: 0 }
  const code = raw.promoCode?.trim()
  if (!code) return { promoCode: null, discountCents: 0 }
  const d = Number.parseInt(raw.discountCents ?? '', 10)
  const discountCents = Number.isFinite(d) && d > 0 ? d : 0
  return { promoCode: code.toLowerCase(), discountCents }
}

function promoRowCanIncrement(
  row: {
    active: boolean
    expiresAt: Date | null
    maxUses: number | null
    usesCount: number
  },
  now: Date,
): boolean {
  if (!row.active) return false
  if (row.expiresAt != null && row.expiresAt <= now) return false
  if (row.maxUses != null && row.usesCount >= row.maxUses) return false
  return true
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

async function clearStripeEventForRetry(eventId: string): Promise<void> {
  try {
    await prisma.stripeEvent.deleteMany({ where: { id: eventId } })
  } catch (err) {
    console.error(
      `[stripe-webhook] failed to clear event marker for retry: ${eventId}`,
      err,
    )
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

  const laneCount = getLaneCount(metadata.bowlerCount, metadata.bowlersPerLane)
  const rawMeta = intent.metadata as Record<string, string> | null
  const { promoCode: metaPromoCode, discountCents: metaDiscount } =
    parsePromoFromIntentMetadata(rawMeta)
  const shoeSelections = parseShoeSelections(rawMeta?.shoeSelections)
  const selectedAddonIds = parseOptionalAddonIds(rawMeta?.optionalAddonIds)
  const smsReminderConsent = rawMeta?.smsReminderConsent === 'true'
  const marketingConsent = rawMeta?.marketingConsent === 'true'
  const now = new Date()

  type FinalizedBooking = {
    id: string
    confirmationCode: string
    startTime: Date
    endTime: Date
    laneCount: number
    bowlerCount: number
    totalAmount: number
  }

  let booking: FinalizedBooking | null = null

  for (let attempt = 0; attempt < BOOKING_FINALIZE_MAX_RETRIES; attempt++) {
    const confirmationCode = generateConfirmationCode()
    try {
      booking = await prisma.$transaction(
        async (tx) => {
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

          const reserved = sumOverlappingLaneCount(
            [...confirmed, ...held],
            metadata.startTime,
            metadata.endTime,
          )
          if (totalLanes - reserved < laneCount) {
            throw new Error(SLOT_UNAVAILABLE_MESSAGE)
          }

          const tenantRow = await tx.tenant.findUniqueOrThrow({
            where: { id: metadata.tenantId },
          })
          const policySnapshot = policySnapshotFromTenantRow(tenantRow)

          let promoCodeId: string | null = null
          let discountAmount = 0
          if (metaPromoCode != null && metaDiscount > 0) {
            discountAmount = metaDiscount
            const promoRow = await tx.promoCode.findUnique({
              where: {
                tenantId_code: {
                  tenantId: metadata.tenantId,
                  code: metaPromoCode,
                },
              },
            })
            if (
              promoRow != null &&
              promoRowCanIncrement(promoRow, now)
            ) {
              promoCodeId = promoRow.id
              await tx.promoCode.update({
                where: { id: promoRow.id },
                data: { usesCount: { increment: 1 } },
              })
            } else {
              console.warn(
                `[stripe-webhook] promo "${metaPromoCode}" not applicable at capture for intent ${intent.id} — recording discount from PaymentIntent metadata`,
              )
            }
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
              discountAmount,
              promoCodeId,
              isRefunded: false,
              cancellationWindowHoursSnapshot:
                policySnapshot.cancellationWindowHours,
              rescheduleWindowHoursSnapshot:
                policySnapshot.rescheduleWindowHours,
              bowlersPerLaneSnapshot: policySnapshot.bowlersPerLane,
              cancellationRefundPercentSnapshot:
                policySnapshot.cancellationRefundPercent,
              smsReminderConsent,
              marketingConsent,
              selectedAddonIds,
            },
          })

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
            tenantId: metadata.tenantId,
            bookingId: created.id,
            laneCount,
            startTime: metadata.startTime,
            endTime: metadata.endTime,
          })

          const claimExpiresAt = new Date(now.getTime() + 24 * 3_600_000)
          await tx.claimToken.create({
            data: {
              bookingId: created.id,
              tenantId: metadata.tenantId,
              email: metadata.customerEmail.toLowerCase(),
              expiresAt: claimExpiresAt,
            },
          })

          if (promoCodeId != null) {
            await tx.auditLog.create({
              data: {
                bookingId: created.id,
                userId: null,
                action: 'BOOKING_PROMO_APPLIED',
                entityType: 'Booking',
                entityId: created.id,
                details: {
                  promoCode: metaPromoCode,
                  discountCents: discountAmount,
                },
              },
            })
          }

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
      const retryable =
        attempt < BOOKING_FINALIZE_MAX_RETRIES - 1 &&
        (isSerializableConflict(err) ||
          isUniqueConstraintOnField(err, ['confirmation_code']))
      if (retryable) {
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
      const packageRow = metadata.packageId
        ? await prisma.package.findFirst({
            where: { id: metadata.packageId, tenantId: metadata.tenantId },
            select: { name: true },
          })
        : null
      await sendBookingConfirmation({
        to: metadata.customerEmail,
        customerName: metadata.customerName || 'Bowler',
        confirmationCode: booking.confirmationCode,
        startTime: booking.startTime,
        endTime: booking.endTime,
        laneCount: booking.laneCount,
        bowlerCount: booking.bowlerCount,
        packageName: packageRow?.name ?? 'Bowling package',
        totalCents: booking.totalAmount,
        venueName: tenant.name,
        venueAddress: tenant.address,
        venuePhone: tenant.phone,
        manageUrl: buildManageUrl(
          booking.confirmationCode,
          metadata.customerEmail,
        ),
        icsUrl: buildIcsUrl(
          booking.confirmationCode,
          metadata.customerEmail,
        ),
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
    include: { booking: { select: { status: true } } },
  })
  if (!payment) return

  const totalRefunded = charge.amount_refunded ?? 0
  const succeeded = (charge.refunded ?? false) && totalRefunded > 0
  const fullyRefunded = succeeded && totalRefunded >= payment.amount

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        refundAmount: totalRefunded,
        refundStatus: succeeded ? 'SUCCEEDED' : 'FAILED',
        refundedAt: succeeded ? new Date() : null,
      },
    })
    if (fullyRefunded) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          isRefunded: true,
          ...(payment.booking.status !== 'CANCELLED'
            ? { status: 'CANCELLED' }
            : {}),
        },
      })
    }
  })
}

async function refundUnavailablePaymentIntent(
  intent: Stripe.PaymentIntent,
): Promise<void> {
  await createRefund({
    paymentIntentId: intent.id,
    amountCents: intent.amount,
    reason: 'requested_by_customer',
    metadata: {
      reason: 'booking_capacity_unavailable',
      paymentIntentId: intent.id,
    },
    idempotencyKey: `booking-capacity-unavailable:${intent.id}`,
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
    if (
      event.type === 'payment_intent.succeeded' &&
      err instanceof Error &&
      err.message === SLOT_UNAVAILABLE_MESSAGE
    ) {
      try {
        await refundUnavailablePaymentIntent(
          event.data.object as Stripe.PaymentIntent,
        )
        return NextResponse.json({
          received: true,
          refunded: true,
          reason: 'capacity-unavailable',
        })
      } catch (refundErr) {
        console.error(
          '[stripe-webhook] failed to refund unavailable booking payment:',
          refundErr,
        )
      }
    }
    await clearStripeEventForRetry(event.id)
    return NextResponse.json(
      { error: 'handler-error' },
      { status: 500 },
    )
  }

  return NextResponse.json({ received: true })
}
