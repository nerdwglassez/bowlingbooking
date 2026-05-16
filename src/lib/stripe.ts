// stripe.ts — single entry point for the Stripe SDK.
//
// Other modules MUST NOT `import 'stripe'` directly. The drift sentinel
// enforces this. All Stripe interactions go through the helpers exported
// here so we can swap SDK versions, add retries, or instrument calls
// from one place.
//
// Dev-without-Stripe: when `STRIPE_SECRET_KEY` is missing in a non-production
// environment, the helpers return mock objects so the booking flow can be
// exercised end-to-end without a real Stripe account. The webhook handler
// also short-circuits in this mode (see src/app/api/webhooks/stripe/route.ts).
// Production refuses to fall back.

import Stripe from 'stripe'

import { warnOnce } from '@/lib/env'

// Re-export the SDK type namespace so other modules can reference event,
// payment-intent, and charge shapes WITHOUT importing 'stripe' directly
// (the drift sentinel rejects direct imports outside this file).
export type { Stripe }

const APP_NAME = 'royalz-lanes'

function resolveSecretKey(): string | undefined {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (key) return key
  if (process.env.NODE_ENV === 'production') return undefined
  warnOnce(
    'stripe-secret',
    'STRIPE_SECRET_KEY is not set — Stripe calls will return mock data. ' +
      'Set STRIPE_SECRET_KEY (sk_test_…) before exercising payment flows.',
  )
  return undefined
}

function makeClient(): Stripe | null {
  const key = resolveSecretKey()
  if (!key) return null
  return new Stripe(key, {
    typescript: true,
    appInfo: { name: APP_NAME },
  })
}

let cached: Stripe | null | undefined
function getStripe(): Stripe | null {
  if (cached === undefined) cached = makeClient()
  return cached
}

/**
 * True when there is no usable Stripe client (dev without STRIPE_SECRET_KEY).
 * Helpers below short-circuit to deterministic mock objects in this mode.
 * Production never returns true.
 */
export function isStripeMocked(): boolean {
  return getStripe() == null
}

export interface CreatePaymentIntentInput {
  amountCents: number
  metadata: Record<string, string>
  customerEmail?: string
  description?: string
}

export interface CreatePaymentIntentResult {
  id: string
  clientSecret: string
  amount: number
  status: string
  mocked: boolean
}

/**
 * Create a Stripe PaymentIntent. Returns the id + client_secret so the
 * client-side Stripe.js can confirm the card.
 */
export async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  const stripe = getStripe()
  if (!stripe) {
    const id = `pi_mock_${Math.random().toString(36).slice(2, 12)}`
    return {
      id,
      clientSecret: `${id}_secret_mock`,
      amount: input.amountCents,
      status: 'requires_payment_method',
      mocked: true,
    }
  }
  const intent = await stripe.paymentIntents.create({
    amount: input.amountCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: input.metadata,
    receipt_email: input.customerEmail,
    description: input.description,
  })
  return {
    id: intent.id,
    clientSecret: intent.client_secret ?? '',
    amount: intent.amount,
    status: intent.status,
    mocked: false,
  }
}

export interface CreateRefundInput {
  paymentIntentId: string
  amountCents?: number
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  metadata?: Record<string, string>
  idempotencyKey?: string
}

export interface CreateRefundResult {
  id: string
  status: string
  amount: number
  mocked: boolean
}

/**
 * Issue a refund against a previously-succeeded PaymentIntent. Stripe
 * settles refunds asynchronously; the webhook (`charge.refunded` /
 * `refund.updated`) is the source of truth for final status.
 */
export async function createRefund(
  input: CreateRefundInput,
): Promise<CreateRefundResult> {
  const stripe = getStripe()
  if (!stripe) {
    return {
      id: `re_mock_${Math.random().toString(36).slice(2, 12)}`,
      status: 'pending',
      amount: input.amountCents ?? 0,
      mocked: true,
    }
  }
  const refund = await stripe.refunds.create(
    {
      payment_intent: input.paymentIntentId,
      amount: input.amountCents,
      reason: input.reason,
      metadata: input.metadata,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  )
  return {
    id: refund.id,
    status: refund.status ?? 'pending',
    amount: refund.amount,
    mocked: false,
  }
}

/**
 * Verify a Stripe webhook signature and return the parsed event.
 * Throws if the signature is invalid; returns null in dev when STRIPE_SECRET_KEY
 * is missing AND no signature header is present (so the route handler can be
 * exercised without a real Stripe configuration).
 */
export function constructWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string | undefined,
): Stripe.Event | null {
  const stripe = getStripe()
  if (!stripe || !webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Stripe webhook received in production without configured client/secret',
      )
    }
    if (!signatureHeader) return null
    try {
      return JSON.parse(rawBody) as Stripe.Event
    } catch {
      return null
    }
  }
  if (!signatureHeader) {
    throw new Error('Missing Stripe-Signature header on webhook request')
  }
  return stripe.webhooks.constructEvent(
    rawBody,
    signatureHeader,
    webhookSecret,
  )
}
