import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateGiftCardCode } from '@/lib/gift-cards'
import { getStripeSecretKey } from '@/lib/stripe-config'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const secret = await getStripeSecretKey()
    if (!secret) {
      return NextResponse.json(
        { error: 'Payment is not configured' },
        { status: 503 }
      )
    }
    const body = await request.json()
    const amount = typeof body?.amount === 'number' ? body.amount : parseFloat(body?.amount)
    const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() || undefined : undefined
    if (Number.isNaN(amount) || amount < 5 || amount > 500) {
      return NextResponse.json(
        { error: 'Amount must be between $5 and $500' },
        { status: 400 }
      )
    }
    const code = await generateGiftCardCode()
    const amountDecimal = Math.round(amount * 100) / 100
    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        initialAmount: amountDecimal,
        balance: 0,
        status: 'PENDING',
        purchaserUserId: session.userId,
        recipientEmail,
      },
    })
    const stripe = new Stripe(secret)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountDecimal * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'gift_card',
        giftCardId: giftCard.id,
      },
    })
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      giftCardId: giftCard.id,
    })
  } catch (error: any) {
    console.error('Gift card purchase error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start purchase' },
      { status: 500 }
    )
  }
}
