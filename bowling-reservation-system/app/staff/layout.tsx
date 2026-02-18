import { requireAuth } from '@/lib/auth'
import UserNav from '@/components/layout/UserNav'
import StaffToastListener from '@/components/staff/StaffToastListener'

export default async function StaffLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal?: React.ReactNode
}) {
  await requireAuth('STAFF')

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNav />
      <StaffToastListener />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      {modal}
    </div>
  )
}

