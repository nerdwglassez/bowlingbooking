// /staff/settings/pricing — default rates and shoe rental (MANAGER+).

import { unauthorized } from 'next/navigation'

import { SettingsSubpageShell } from '@/components/chrome/settings-subpage-shell'
import { getTenantForAdmin, listPricingPeriodsForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { PricingSettingsPanel } from './pricing-settings-panel'

export default async function StaffSettingsPricingPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (user.role === 'STAFF') unauthorized()

  const tenant = await getTenant()
  const [detail, periods] = await Promise.all([
    getTenantForAdmin(tenant.id),
    listPricingPeriodsForAdmin(tenant.id),
  ])
  if (!detail) unauthorized()

  return (
    <SettingsSubpageShell
      title="Pricing"
      subtitle="Set your default rate and add overrides for peak times or special periods."
    >
      <PricingSettingsPanel initial={detail} periods={periods} />
    </SettingsSubpageShell>
  )
}
