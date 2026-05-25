// stripe-client.ts — single entry point for Stripe.js on the BROWSER side.
//
// `src/lib/stripe.ts` is the server-side SDK wrapper; this file is its
// client-side counterpart. The drift sentinel forbids importing
// `@stripe/stripe-js` anywhere else.
//
// `getStripeClient()` returns a Promise that resolves to the Stripe.js
// instance for use with @stripe/react-stripe-js's <Elements> provider.
// Returns null when `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing — the
// step-4 page renders a "mock mode" branch instead.

import {
  loadStripe,
  type PaymentIntent,
  type Stripe,
  type StripeElements,
} from '@stripe/stripe-js'

export type { PaymentIntent, Stripe, StripeElements }

let cached: Promise<Stripe | null> | null = null

export function getStripeClient(): Promise<Stripe | null> {
  if (cached) return cached
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  if (!publishable) {
    cached = Promise.resolve(null)
    return cached
  }
  cached = loadStripe(publishable)
  return cached
}

/**
 * Mirrors `isStripeMocked()` from src/lib/stripe.ts on the client. The two
 * derive from different env vars (publishable vs secret), so an asymmetric
 * config (e.g. server has keys, client doesn't) is possible — both must be
 * set to exercise the real flow.
 */
export function isStripeClientMocked(): boolean {
  return !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
}
