// /staff/settings/integrations — integration status (ADMIN only).

import { unauthorized } from 'next/navigation'

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { requireRole } from '@/lib/auth'

import { IntegrationsSettingsPanel } from './integrations-settings-panel'

export default async function StaffSettingsIntegrationsPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (user.role !== 'ADMIN') unauthorized()

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim())

  const cards = [
    {
      key: 'stripe' as const,
      title: 'Stripe',
      status: stripeConfigured ? 'Connected' : 'Required · not connected',
      summary: 'Online payments go directly to your Stripe account.',
      detail: stripeConfigured
        ? 'Stripe secret key is configured in the server environment. Connect OAuth and payout details are managed in the Stripe Dashboard for now.'
        : 'Add STRIPE_SECRET_KEY to enable card payments. Without Stripe, online checkout cannot capture payments.',
    },
    {
      key: 'resend' as const,
      title: 'Resend',
      status: resendConfigured ? 'Connected' : 'Optional · not configured',
      summary: 'Transactional email for confirmations and receipts.',
      detail: resendConfigured
        ? 'Resend API key is set. Booking confirmations and receipts send through Resend.'
        : 'Optional: set RESEND_API_KEY to send booking emails. The app still works without email delivery.',
    },
    {
      key: 'make' as const,
      title: 'Make',
      status: 'Optional',
      summary: 'Webhook automation for external workflows.',
      detail:
        'Make (Integromat) webhooks are optional. Configure a scenario URL in your Make account and point it at venue automation endpoints when available.',
    },
  ]

  return (
    <>
      <SettingsSubpageHeader
        title="Integrations"
        subtitle="Payments, automation, and email delivery."
      />
      <IntegrationsSettingsPanel cards={cards} />
    </>
  )
}
