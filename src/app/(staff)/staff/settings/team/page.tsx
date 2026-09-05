// /staff/settings/team — team management (MANAGER + ADMIN).

import { listTeamForAdmin } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { TeamSettingsPanel } from './team-settings-panel'

type PageProps = {
  searchParams: Promise<{ member?: string }>
}

export default async function StaffSettingsTeamPage({ searchParams }: PageProps) {
  const user = await requireRole('MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const users = await listTeamForAdmin(tenant.id)
  const callerRole = user.role === 'ADMIN' ? 'ADMIN' : 'MANAGER'
  const { member: initialMemberId } = await searchParams

  return (
    <TeamSettingsPanel
      tenantId={tenant.id}
      users={users}
      callerRole={callerRole}
      callerId={user.id}
      initialMemberId={initialMemberId}
    />
  )
}
