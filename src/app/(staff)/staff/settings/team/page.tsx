// /staff/settings/team — team management (ADMIN).

import { unauthorized } from 'next/navigation'

import { SettingsSubpageHeader } from '@/components/patterns/settings-subpage-header'
import { listTeamForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { TeamSettingsPanel } from './team-settings-panel'

export default async function StaffSettingsTeamPage() {
  const user = await requireRole('ADMIN')
  if (user.role !== 'ADMIN') unauthorized()
  const tenant = await getTenant()
  const users = await listTeamForAdmin(tenant.id)

  return (
    <>
      <SettingsSubpageHeader
        title="Team"
        subtitle="Invite staff and managers."
      />
      <TeamSettingsPanel
        tenantId={tenant.id}
        users={users}
        callerRole="ADMIN"
      />
    </>
  )
}
