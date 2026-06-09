import { redirect } from 'next/navigation'

/** Legacy admin route — team management lives in staff settings. */
export default function LegacyNewTeamMemberPage() {
  redirect('/staff/settings/team')
}
