// /staff — cockpit page (staff-app-v2.html + walkin-booking-flow.html).

import { CockpitPageClient } from './cockpit-page-client'
import { getPackagesForTenant } from '@/lib/actions/booking'
import { getCockpitSnapshot } from '@/lib/actions/staff'
import { getCurrentUser } from '@/lib/auth'
import { buildCockpitClockLine } from '@/lib/cockpit-display'
import { getTenant } from '@/lib/tenant'

export default async function StaffCockpitPage({
  searchParams,
}: {
  searchParams: Promise<{ walkin?: string }>
}) {
  const tenant = await getTenant()
  const user = await getCurrentUser()
  const [snapshot, packages, params] = await Promise.all([
    getCockpitSnapshot(tenant.id),
    getPackagesForTenant(tenant.id),
    searchParams,
  ])

  const canRefund = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  return (
    <CockpitPageClient
      {...snapshot}
      tenantId={tenant.id}
      packages={packages}
      venueName={tenant.name}
      clockLine={buildCockpitClockLine()}
      initialWalkInOpen={params.walkin === '1'}
      canRefund={canRefund}
    />
  )
}
