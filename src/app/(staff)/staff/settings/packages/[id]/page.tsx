// /staff/settings/packages/[id] — edit package (MANAGER+).

import { notFound, unauthorized } from 'next/navigation'

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { PackageEditor } from '@/app/(admin)/admin/packages/package-editor'
import { getPackageForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

type PageProps = { params: Promise<{ id: string }> }

export default async function StaffSettingsEditPackagePage({ params }: PageProps) {
  const user = await requireRole('MANAGER', 'ADMIN')
  if (user.role === 'STAFF') unauthorized()
  const { id } = await params
  const tenant = await getTenant()
  const pkg = await getPackageForAdmin(id)
  if (!pkg) notFound()

  return (
    <>
      <SettingsSubpageHeader
        title={pkg.name}
        backHref="/staff/settings/packages"
        backLabel="Packages"
      />
      <PackageEditor
        mode="edit"
        tenantId={tenant.id}
        initial={pkg}
        listPath="/staff/settings/packages"
      />
    </>
  )
}
