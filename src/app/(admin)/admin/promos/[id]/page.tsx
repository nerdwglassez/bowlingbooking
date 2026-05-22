// /admin/promos/[id] — edit a promo code.

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPromoForAdmin } from '@/lib/actions/admin'
import { getTenant } from '@/lib/tenant'

import { PromoEditor } from '../promo-editor'

type PageProps = { params: Promise<{ id: string }> }

export default async function EditPromoPage({ params }: PageProps) {
  const { id } = await params
  const [tenant, promo] = await Promise.all([
    getTenant(),
    getPromoForAdmin(id),
  ])
  if (!promo) notFound()

  return (
    <>
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/promos"
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to promos
        </Link>
        <h1 className="text-2xl">{promo.code.toUpperCase()}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {promo.active
            ? 'Eligible for new online bookings when valid.'
            : 'Inactive — not offered on new checkouts.'}
        </p>
      </header>
      <PromoEditor mode="edit" tenantId={tenant.id} initial={promo} />
    </>
  )
}
