import { requireAuth } from '@/lib/auth'
import AppExperienceHeader from '@/components/layout/AppExperienceHeader'
import { getHeaderUser } from '@/lib/header-user'
import StaffToastListener from '@/components/staff/StaffToastListener'

export default async function StaffLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal?: React.ReactNode
}) {
  await requireAuth('STAFF')
  const initialUser = await getHeaderUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppExperienceHeader variant="staff" initialUser={initialUser} />
      <StaffToastListener />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      {modal}
    </div>
  )
}

