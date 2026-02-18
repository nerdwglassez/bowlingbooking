/**
 * Stripe credentials for server-side use. Prefers integration config (UI) over env.
 */

import { getIntegrationConfig } from './integration-settings'

export async function getStripeSecretKey(): Promise<string | undefined> {
  const config = await getIntegrationConfig('stripe')
  return config?.secretKey || process.env.STRIPE_SECRET_KEY || undefined
}

export async function getStripeWebhookSecret(): Promise<string | undefined> {
  const config = await getIntegrationConfig('stripe')
  return config?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || undefined
}

export async function getStripePublishableKey(): Promise<string | undefined> {
  const config = await getIntegrationConfig('stripe')
  return (
    config?.publishableKey ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    undefined
  )
}
