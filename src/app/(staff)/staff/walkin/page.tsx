// /staff/walkin — server shell that loads packages and renders the client form.

import { getPackagesForTenant } from '@/lib/actions/booking'
import { getTenant } from '@/lib/tenant'

import { WalkInPanel } from './walkin-panel'

export default async function StaffWalkInPage() {
  const tenant = await getTenant()
  const packages = await getPackagesForTenant(tenant.id)
  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">New walk-in</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Books lanes immediately. Choose how the customer paid; Stripe is
          bypassed for walk-ins.
        </p>
      </header>
      <WalkInPanel tenantId={tenant.id} packages={packages} />
    </>
  )
}
