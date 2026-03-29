import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

    const payLimit = checkRateLimit(
      rateLimitKey(request, 'create-payment-intent', session.userId),
      40,
      60_000
    )
    if (!payLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many payment setup attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(payLimit.retryAfterSeconds) } }
      )
    }

    const secret = await getStripeSecretKey()
    if (!secret) {
      return NextResponse.json(
        { error: 'Payment is not configured. Contact support.' },
        { status: 503 }
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

    const amountCents = Math.round(Number(booking.totalPrice) * 100)
    if (amountCents < 50) {
      return NextResponse.json(
        { error: 'Minimum charge is $0.50' },
        { status: 400 }
      )
    }

    const stripe = new Stripe(secret)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId: booking.id,
        userId: session.userId,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error: any) {
    console.error('Create payment intent error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
