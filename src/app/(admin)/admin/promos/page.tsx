// /admin/promos — list view.

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/patterns/empty-state'
import { listPromosForAdmin } from '@/lib/actions/admin'
import { formatPrice } from '@/lib/pricing'
import { getTenant } from '@/lib/tenant'

function formatDiscountLabel(
  discountType: 'PERCENT' | 'FIXED',
  discountValue: number,
): string {
  if (discountType === 'PERCENT') return `${discountValue}% off`
  return `${formatPrice(discountValue)} off`
}

export default async function AdminPromosPage() {
  const tenant = await getTenant()
  const promos = await listPromosForAdmin(tenant.id)

  return (
    <>
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Promos</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {promos.length} total · {promos.filter((p) => p.active).length} active
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/promos/new">New promo</Link>
        </Button>
      </header>

      {promos.length === 0 ? (
        <EmptyState
          title="No promo codes yet"
          description="Create a code to offer percent or fixed discounts at checkout."
          action={
            <Button asChild>
              <Link href="/admin/promos/new">New promo</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {promos.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/promos/${p.id}`}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4 text-sm transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)] md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-base text-[var(--color-text-primary)]">
                    {p.code.toUpperCase()}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {formatDiscountLabel(p.discountType, p.discountValue)} · used{' '}
                    {p.usesCount}
                    {p.maxUses != null ? ` / ${p.maxUses}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.active ? 'ok' : 'default'}>
                    {p.active ? 'Active' : 'Inactive'}
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
