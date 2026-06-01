// /staff/settings/policies — booking policies (MANAGER+).

import { unauthorized } from 'next/navigation'

import { SettingsSubpageShell } from '@/components/chrome/settings-subpage-shell'
import { getTenantForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { PoliciesSettingsPanel } from './policies-settings-panel'

export default async function StaffSettingsPoliciesPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (user.role === 'STAFF') unauthorized()

  const tenant = await getTenant()
  const detail = await getTenantForAdmin(tenant.id)
  if (!detail) unauthorized()

  return (
    <SettingsSubpageShell
      title="Booking policies"
      subtitle="Hold time, cancellation rules, and online booking limits."
    >
      <PoliciesSettingsPanel initial={detail} />
    </SettingsSubpageShell>
  )
}
