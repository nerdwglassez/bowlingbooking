// /admin/venue — venue details + operating hours.
//
// Server Component shell that loads the tenant + hours, then hands off to
// two client islands for the editors.

import { notFound } from 'next/navigation'

import { getOperatingHours, getTenantForAdmin } from '@/lib/actions/admin'
import { getTenant } from '@/lib/tenant'

import { OperatingHoursPanel } from './operating-hours-panel'
import { VenueDetailsPanel } from './venue-details-panel'

export default async function AdminVenuePage() {
  const tenant = await getTenant()
  const [detail, hours] = await Promise.all([
    getTenantForAdmin(tenant.id),
    getOperatingHours(tenant.id),
  ])
  if (!detail) notFound()

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Venue</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          What customers see in confirmations + the booking flow.
        </p>
      </header>
      <VenueDetailsPanel initial={detail} />
      <OperatingHoursPanel tenantId={tenant.id} initial={hours} />
    </>
  )
}
