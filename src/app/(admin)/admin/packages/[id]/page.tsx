// /admin/packages/[id] — edit an existing package.

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPackageForAdmin } from '@/lib/actions/admin'
import { getTenant } from '@/lib/tenant'

import { PackageEditor } from '../package-editor'

type PageProps = { params: Promise<{ id: string }> }

export default async function EditPackagePage({ params }: PageProps) {
  const { id } = await params
  const [tenant, pkg] = await Promise.all([getTenant(), getPackageForAdmin(id)])
  if (!pkg) notFound()

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/packages"
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to packages
        </Link>
        <h1 className="text-2xl">{pkg.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {pkg.active ? 'Visible to customers' : 'Archived — hidden from new bookings'}
        </p>
      </header>
      <PackageEditor mode="edit" tenantId={tenant.id} initial={pkg} />
    </>
  )
}
