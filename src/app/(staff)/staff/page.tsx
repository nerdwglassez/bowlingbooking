// /staff — cockpit page (staff-app-v2.html + walkin-booking-flow.html).

import { CockpitPanel } from './cockpit-panel'
import { PaymentResumePanel } from './payment-resume-panel'
import { getPackagesForTenant } from '@/lib/actions/booking'
import { getCockpitSnapshot } from '@/lib/actions/staff'
import { buildCockpitClockLine } from '@/lib/cockpit-display'
import { getTenant } from '@/lib/tenant'

export default async function StaffCockpitPage({
  searchParams,
}: {
  searchParams: Promise<{ walkin?: string }>
}) {
  const tenant = await getTenant()
  const [snapshot, packages, params] = await Promise.all([
    getCockpitSnapshot(tenant.id),
    getPackagesForTenant(tenant.id),
    searchParams,
  ])

  return (
    <>
      <CockpitPanel
        {...snapshot}
        tenantId={tenant.id}
        packages={packages}
        venueName={tenant.name}
        clockLine={buildCockpitClockLine()}
        initialWalkInOpen={params.walkin === '1'}
      />
      <PaymentResumePanel />
    </>
  )
}
