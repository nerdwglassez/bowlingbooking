// /staff/settings/integrations — connection management (ADMIN only).

import { unauthorized } from 'next/navigation'

import { requireRole } from '@/lib/auth'
import { listIntegrationCardStates } from '@/lib/actions/admin'

import { IntegrationsSettingsPanel } from './integrations-settings-panel'

export default async function StaffSettingsIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (user.role !== 'ADMIN') unauthorized()

  const params = await searchParams
  const stripeParam = params.stripe
  const stripeFlash =
    typeof stripeParam === 'string' &&
    (stripeParam === 'return' || stripeParam === 'refresh')
      ? stripeParam
      : null

  const cards = await listIntegrationCardStates()

  return (
    <IntegrationsSettingsPanel cards={cards} stripeFlash={stripeFlash} />
  )
}
