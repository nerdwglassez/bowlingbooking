// /staff/settings — Figma has no hub; Profile is the default section.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function StaffSettingsIndexPage() {
  redirect('/staff/settings/profile')
}
