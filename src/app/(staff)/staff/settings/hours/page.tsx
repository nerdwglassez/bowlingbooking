// /staff/settings/hours — operating hours (view for STAFF, edit for MANAGER+).

import { SettingsSubpageShell } from '@/components/chrome/settings-subpage-shell'
import { getOperatingHours, getTenantSettingsDetail } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { HoursSettingsPanel } from './hours-settings-panel'

export default async function StaffSettingsHoursPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const hours = await getOperatingHours(tenant.id)
  const readOnly = user.role === 'STAFF'

  const detail = await getTenantSettingsDetail(tenant.id)
  if (!detail) return null

  return (
    <SettingsSubpageShell
      title="Operating hours"
      subtitle={
        readOnly
          ? 'View only — contact a manager to make changes.'
          : 'Online booking only shows times within these hours.'
      }
    >
      <HoursSettingsPanel
        tenantId={tenant.id}
        initialHours={hours}
        tenant={detail}
        readOnly={readOnly}
      />
    </SettingsSubpageShell>
  )
}
