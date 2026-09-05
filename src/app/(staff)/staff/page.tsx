// /staff — cockpit page (staff-app-v2.html + walkin-booking-flow.html).

import { CockpitPageClient } from './cockpit-page-client'
import { getPackagesForTenant } from '@/lib/actions/booking'
import { getCockpitSnapshot } from '@/lib/actions/staff'
import { getCurrentUser } from '@/lib/auth'
import { buildCockpitClockLine } from '@/lib/cockpit-display'
import { withStaffPageSpan } from '@/lib/observability'
import { getAllowWalkInBookings, getTenant } from '@/lib/tenant'

export default async function StaffCockpitPage({
  searchParams,
}: {
  searchParams: Promise<{ walkin?: string; view?: string; booking?: string }>
}) {
  return withStaffPageSpan('staff.cockpit.load', async () => {
    const tenant = await getTenant()
    const user = await getCurrentUser()
    const [snapshot, packages, params] = await Promise.all([
      getCockpitSnapshot(tenant.id),
      getPackagesForTenant(tenant.id),
      searchParams,
    ])

    const canRefund = user?.role === 'MANAGER' || user?.role === 'ADMIN'
    const subview = params.view === 'lanes' ? 'lanes' : 'overview'

    return (
      <CockpitPageClient
        {...snapshot}
        tenantId={tenant.id}
        packages={packages}
        venueName={tenant.name}
        clockLine={buildCockpitClockLine(new Date(), tenant.timezone)}
        initialWalkInOpen={params.walkin === '1'}
        bowlersPerLane={tenant.bowlersPerLane}
        allowWalkInBookings={getAllowWalkInBookings(tenant)}
        canRefund={canRefund}
        subview={subview}
      />
    )
  })
}
