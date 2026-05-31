// /staff/settings/hours — operating hours (view for STAFF, edit for MANAGER+).

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { getOperatingHours, getTenantForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { HoursSettingsPanel } from './hours-settings-panel'

export default async function StaffSettingsHoursPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const hours = await getOperatingHours(tenant.id)
  const readOnly = user.role === 'STAFF'

  const detail =
    user.role === 'STAFF'
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          address: tenant.address,
          phone: tenant.phone,
          timezone: tenant.timezone,
          themeSlug: tenant.themeSlug,
          holdTimeoutMins: tenant.holdTimeoutMins,
          maxOnlineBowlers: tenant.maxOnlineBowlers,
          cancellationWindowHours: 24,
          cancellationRefundPercent: 100,
          contactEmail: '',
          shoeRentalPriceCents: 400,
          laneReservationCentsPerLane: 1200,
          pricingStrategy: 'packages_only',
          minBookingDurationHours: 1.5,
          maxBookingDurationHours: 4,
          totalLanes: 12,
        }
      : await getTenantForAdmin(tenant.id)

  if (!detail) {
    return null
  }

  return (
    <>
      <SettingsSubpageHeader
        title="Operating hours"
        subtitle={
          readOnly
            ? 'View only — contact a manager to make changes.'
            : 'Online booking only shows times within these hours.'
        }
      />
      <HoursSettingsPanel
        tenantId={tenant.id}
        initialHours={hours}
        tenant={detail}
        readOnly={readOnly}
      />
    </>
  )
}
