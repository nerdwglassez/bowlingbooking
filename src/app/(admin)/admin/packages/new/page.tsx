// /admin/packages/new — create a new package.

import Link from 'next/link'

import { getTenant } from '@/lib/tenant'

import { PackageEditor } from '../package-editor'

export default async function NewPackagePage() {
  const tenant = await getTenant()
  return (
    <>
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/packages"
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to packages
        </Link>
        <h1 className="text-2xl">New package</h1>
      </header>
      <PackageEditor mode="create" tenantId={tenant.id} />
    </>
  )
}
