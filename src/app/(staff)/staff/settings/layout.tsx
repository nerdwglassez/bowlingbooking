// Settings section layout — desktop sidebar + staff toasts for all sub-pages.

export const dynamic = 'force-dynamic'

import { SettingsSectionProviders } from '@/components/chrome/settings-section-providers'
import { SettingsLayout } from '@/components/patterns/settings-layout'
import { getSettingsHubMeta } from '@/lib/actions/admin'
import { requireRole } from '@/lib/auth'
import { getSettingsGroups } from '@/lib/staff-nav'
import { getTenant } from '@/lib/tenant'

export default async function StaffSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const meta = await getSettingsHubMeta(tenant.id)
  const groups = getSettingsGroups(user.role, meta)

  return (
    <SettingsSectionProviders>
      <SettingsLayout groups={groups} venueName={tenant.name}>
        {children}
      </SettingsLayout>
    </SettingsSectionProviders>
  )
}
