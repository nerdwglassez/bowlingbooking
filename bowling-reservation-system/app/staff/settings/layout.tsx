import { requireAuth } from '@/lib/auth'
import SettingsNav from '@/components/staff/settings/SettingsNav'
import ImmersiveStaffPage from '@/components/layout/ImmersiveStaffPage'
import StaffPageHero from '@/components/staff/StaffPageHero'
import type { ReactNode } from 'react'

export default async function StaffSettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAuth('STAFF')

  return (
    <div className="space-y-0">
      <ImmersiveStaffPage />
      <StaffPageHero
        title="Settings"
        description="Manage your bowling alley configuration"
        gradient="settings"
      />

      <div className="grid grid-cols-1 gap-5 px-4 py-6 sm:px-0 lg:grid-cols-[268px_1fr]">
        <div>
          <SettingsNav />
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  )
}
