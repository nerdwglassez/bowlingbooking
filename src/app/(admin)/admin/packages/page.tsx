// /admin/packages — list view.
//
// Server Component. Lists every package (active first, then archived) with
// quick visual cues. Each row links to /admin/packages/[id] for editing.
// A "New package" button at the top routes to /admin/packages/new.

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/patterns/empty-state'
import { listPackagesForAdmin } from '@/lib/actions/admin'
import { formatPrice } from '@/lib/pricing'
import { getTenant } from '@/lib/tenant'

export default async function AdminPackagesPage() {
  const tenant = await getTenant()
  const packages = await listPackagesForAdmin(tenant.id)

  return (
    <>
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Packages</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {packages.length} total · {packages.filter((p) => p.active).length}{' '}
            active
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/packages/new">New package</Link>
        </Button>
      </header>

      {packages.length === 0 ? (
        <EmptyState
          title="No packages yet"
          description="Create your first package — customers can't book without one."
          action={
            <Button asChild>
              <Link href="/admin/packages/new">New package</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {packages.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/packages/${p.id}`}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4 text-sm transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)] md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-base text-[var(--color-text-primary)]">
                    {p.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {p.partyTypes.join(', ')} · sort {p.sortOrder}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {formatPrice(p.basePrice)}
                  </span>
                  <Badge variant={p.active ? 'ok' : 'default'}>
                    {p.active ? 'Active' : 'Archived'}
                  </Badge>
                  <span
                    aria-hidden
                    className="hidden text-[var(--color-text-secondary)] md:inline"
                  >
                    ›
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
