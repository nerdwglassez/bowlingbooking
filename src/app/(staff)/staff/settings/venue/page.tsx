// /staff/settings/venue — venue identity and contact (ADMIN only).

import { unauthorized } from 'next/navigation'

import { SettingsSubpageShell } from '@/components/chrome/settings-subpage-shell'
import { getTenantForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { VenueInfoPanel } from './venue-info-panel'

export default async function StaffSettingsVenuePage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (user.role !== 'ADMIN') unauthorized()

  const tenant = await getTenant()
  const detail = await getTenantForAdmin(tenant.id)
  if (!detail) unauthorized()

  return (
    <SettingsSubpageShell
      title="Venue info"
      subtitle="Shown to customers in the booking app, emails, and confirmations."
    >
      <VenueInfoPanel initial={detail} />
    </SettingsSubpageShell>
  )
}
