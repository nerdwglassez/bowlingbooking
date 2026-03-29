import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { awardPointsForBooking, redeemPointsForBooking } from '@/lib/loyalty'
import { applyGiftCardToBooking } from '@/lib/gift-cards'
import { getStripeSecretKey } from '@/lib/stripe-config'
import Stripe from 'stripe'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    const { id } = await params
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const confirmLimit = checkRateLimit(
      rateLimitKey(request, 'confirm-payment', session.userId),
      40,
      60_000
    )
    if (!confirmLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many confirmation attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(confirmLimit.retryAfterSeconds) } }
      )
    }

    const secret = await getStripeSecretKey()
    if (!secret) {
      return NextResponse.json(
        { error: 'Payment is not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const paymentIntentId = body?.paymentIntentId
    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    if (booking.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (booking.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Booking is not pending payment' },
        { status: 400 }
      )
    }

    const stripe = new Stripe(secret)
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not succeeded yet' },
        { status: 400 }
      )
    }
    if (paymentIntent.metadata?.bookingId !== booking.id) {
      return NextResponse.json(
        { error: 'Payment does not match this booking' },
        { status: 400 }
      )
    }

    const amountCents = Math.round(Number(booking.totalPrice) * 100)
    if (paymentIntent.amount !== amountCents) {
      return NextResponse.json(
        { error: 'Payment amount does not match booking' },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PAID' },
      }),
      prisma.payment.create({
        data: {
          bookingId: booking.id,
          stripePaymentIntentId: paymentIntentId,
          amount: booking.totalPrice,
          status: 'succeeded',
        },
      }),
    ])

    // Loyalty: deduct redeemed points, then award points for this payment
    if (booking.loyaltyPointsRedeemed != null && booking.loyaltyDiscountAmount != null) {
      await redeemPointsForBooking(
        booking.userId,
        booking.id,
        booking.loyaltyPointsRedeemed,
        Number(booking.loyaltyDiscountAmount)
      )
    }
    await awardPointsForBooking(booking.userId, booking.id, Number(booking.totalPrice))
    if (booking.giftCardId != null && booking.giftCardAmountApplied != null) {
      await applyGiftCardToBooking(booking.giftCardId, Number(booking.giftCardAmountApplied))
    }

    // Send confirmation email after successful payment
    const bookingWithPackages = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        user: { select: { email: true } },
        bookingPackages: {
          include: { package: true },
        },
      },
    })
    if (bookingWithPackages?.user?.email) {
      const forEmail = {
        ...bookingWithPackages,
        totalPrice: Number(bookingWithPackages.totalPrice),
        lanes: bookingWithPackages.lanes ? (JSON.parse(bookingWithPackages.lanes) as number[]) : undefined,
        bookingPackages: bookingWithPackages.bookingPackages?.map((bp) => ({
          package: { name: bp.package.name, price: Number(bp.package.price) },
        })),
      }
      sendBookingConfirmationEmail(forEmail, bookingWithPackages.user.email).catch((err) =>
        console.error('[confirm-payment] Confirmation email failed:', err)
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Confirm payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
