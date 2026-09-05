// Settings section layout — Figma section switcher (desktop tabs, mobile Select).
// Unsaved-changes guard + form context come from AppShell.

export const dynamic = 'force-dynamic'

import { SettingsSectionHeader } from '@/components/chrome/settings-section-header'
import { requireRole } from '@/lib/auth'
import { getSettingsSectionItems } from '@/lib/staff-nav'
import { getTenant } from '@/lib/tenant'

export default async function StaffSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const sections = getSettingsSectionItems(user.role)

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <SettingsSectionHeader sections={sections} venueName={tenant.name} />
      {children}
    </div>
  )
}
