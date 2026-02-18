import { NextResponse } from 'next/server'
import { getStripePublishableKey } from '@/lib/stripe-config'

/**
 * Public endpoint so the client can load Stripe when the publishable key
 * is set via Staff/Admin Integrations (stored in DB). Safe to expose.
 */
export async function GET() {
  const publishableKey = await getStripePublishableKey()
  return NextResponse.json({ publishableKey: publishableKey ?? null })
}
