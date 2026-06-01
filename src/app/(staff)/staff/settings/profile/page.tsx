// /staff/settings/profile — account settings (all roles).

import { SettingsSubpageShell } from '@/components/chrome/settings-subpage-shell'
import { requireRole } from '@/lib/auth'

import { ProfileSettingsPanel } from './profile-settings-panel'

export default async function StaffSettingsProfilePage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')

  return (
    <SettingsSubpageShell
      title="My profile"
      subtitle="Name, email, and password."
    >
      <ProfileSettingsPanel
        initial={{
          name: user.name ?? '',
          email: user.email ?? '',
        }}
      />
    </SettingsSubpageShell>
  )
}
