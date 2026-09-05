// /staff/settings/packages/new — create package (MANAGER+).

import { unauthorized } from 'next/navigation'

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { PackageEditor } from '@/app/(admin)/admin/packages/package-editor'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

export default async function StaffSettingsNewPackagePage() {
  const user = await requireRole('MANAGER', 'ADMIN')
  if (user.role === 'STAFF') unauthorized()
  const tenant = await getTenant()

  return (
    <>
      <SettingsSubpageHeader title="New package" />
      <PackageEditor
        mode="create"
        tenantId={tenant.id}
        listPath="/staff/settings/packages"
      />
    </>
  )
}
