import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getStripeSecretKey } from '@/lib/stripe-config'
import Stripe from 'stripe'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limiter = checkRateLimit(
      rateLimitKey(request, 'gift-card-confirm', session.userId),
      40,
      60_000
    )
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many confirmation attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
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
    const stripe = new Stripe(secret)
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not succeeded' },
        { status: 400 }
      )
    }
    if (paymentIntent.metadata?.type !== 'gift_card') {
      return NextResponse.json(
        { error: 'Invalid payment type' },
        { status: 400 }
      )
    }
    const giftCardId = paymentIntent.metadata.giftCardId
    if (!giftCardId) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 400 }
      )
    }
    const giftCard = await prisma.giftCard.findUnique({
      where: { id: giftCardId },
    })
    if (!giftCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      )
    }
    if (giftCard.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Gift card already activated' },
        { status: 400 }
      )
    }
    const initialAmount = Number(giftCard.initialAmount)
    await prisma.giftCard.update({
      where: { id: giftCardId },
      data: { balance: initialAmount, status: 'ACTIVE' },
    })
    return NextResponse.json({
      success: true,
      code: giftCard.code,
      initialAmount,
    })
  } catch (error: any) {
    console.error('Gift card confirm error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to confirm' },
      { status: 500 }
    )
  }
}
