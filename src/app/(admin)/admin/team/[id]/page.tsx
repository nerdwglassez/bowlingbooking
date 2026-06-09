import { redirect } from 'next/navigation'

type PageProps = { params: Promise<{ id: string }> }

/** Legacy admin route — team management lives in staff settings. */
export default async function LegacyEditTeamMemberPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/staff/settings/team?member=${encodeURIComponent(id)}`)
}
