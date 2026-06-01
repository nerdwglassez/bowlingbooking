// /staff/settings/packages — unified packages (view STAFF, edit MANAGER+).

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { listPackagesForSettings } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { PackagesSettingsPanel } from './packages-settings-panel'

export default async function StaffSettingsPackagesPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const canEdit = user.role === 'MANAGER' || user.role === 'ADMIN'
  const packages = await listPackagesForSettings(tenant.id)

  return (
    <>
      <SettingsSubpageHeader
        title="Packages"
        subtitle={
          canEdit
            ? 'Public packages and code-gated offers.'
            : 'View only — contact a manager to make changes.'
        }
      />
      <PackagesSettingsPanel packages={packages} canEdit={canEdit} />
    </>
  )
}
