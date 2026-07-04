'use server'

import { retrievePaymentIntent } from '@/lib/stripe'
import {
  paymentResumeExpiresAt,
  signPaymentResumeToken,
  verifyPaymentResumeToken,
} from '@/lib/payment-resume-token'
import { requireRole } from '@/lib/auth'
import { isDevWithoutDb, resolveAppBaseUrl } from '@/lib/env'

export interface CreatePaymentResumeLinkResult {
  url: string
  expiresAt: Date
  paymentIntentId: string
  amountCents: number
  status: string
  mocked: boolean
}

/**
 * Staff generates a signed URL so a customer can finish an uncaptured
 * PaymentIntent (e.g. after 3DS failure or abandoned checkout).
 */
export async function createPaymentResumeLink(
  paymentIntentId: string,
): Promise<CreatePaymentResumeLinkResult> {
  await requireRole('STAFF', 'MANAGER', 'ADMIN')

  const trimmed = paymentIntentId.trim()
  if (!trimmed.startsWith('pi_')) {
    throw new Error('Enter a valid Stripe Payment Intent id (starts with pi_).')
  }

  if (isDevWithoutDb()) {
    const token = signPaymentResumeToken(trimmed)
    return {
      url: `${resolveAppBaseUrl()}/book/resume-payment?t=${encodeURIComponent(token)}`,
      expiresAt: paymentResumeExpiresAt(),
      paymentIntentId: trimmed,
      amountCents: 4500,
      status: 'requires_payment_method',
      mocked: true,
    }
  }

  const intent = await retrievePaymentIntent(trimmed)
  const token = signPaymentResumeToken(intent.id)
  return {
    url: `${resolveAppBaseUrl()}/book/resume-payment?t=${encodeURIComponent(token)}`,
    expiresAt: paymentResumeExpiresAt(),
    paymentIntentId: intent.id,
    amountCents: intent.amount,
    status: intent.status,
    mocked: intent.mocked,
  }
}

export interface ResumePaymentClientResult {
  clientSecret: string
  paymentIntentId: string
  amountCents: number
  mocked: boolean
}

/** Public — token is the auth gate. */
export async function getResumePaymentClientSecret(
  token: string,
): Promise<ResumePaymentClientResult> {
  const verified = verifyPaymentResumeToken(token.trim())
  if (!verified) {
    throw new Error('This payment link is invalid or has expired.')
  }

  const intent = await retrievePaymentIntent(verified.paymentIntentId)
  return {
    clientSecret: intent.clientSecret,
    paymentIntentId: intent.id,
    amountCents: intent.amount,
    mocked: intent.mocked,
  }
}
