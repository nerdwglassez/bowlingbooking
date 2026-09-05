// /staff/settings/profile — account settings (all roles).

import { getStaffProfile } from '@/lib/actions/admin'

import { ProfileSettingsPanel } from './profile-settings-panel'

export default async function StaffSettingsProfilePage() {
  const initial = await getStaffProfile()

  return <ProfileSettingsPanel initial={initial} />
}
