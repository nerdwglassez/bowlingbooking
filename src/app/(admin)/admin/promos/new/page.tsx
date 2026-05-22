// /admin/promos/new — create a promo code.

import Link from 'next/link'

import { getTenant } from '@/lib/tenant'

import { PromoEditor } from '../promo-editor'

export default async function NewPromoPage() {
  const tenant = await getTenant()
  return (
    <>
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/promos"
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to promos
        </Link>
        <h1 className="text-2xl">New promo</h1>
      </header>
      <PromoEditor mode="create" tenantId={tenant.id} />
    </>
  )
}
