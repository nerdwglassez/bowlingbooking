import { requireAuth } from '@/lib/auth'
import AppExperienceHeader from '@/components/layout/AppExperienceHeader'
import { getHeaderUser } from '@/lib/header-user'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth('ADMIN')
  const initialUser = await getHeaderUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppExperienceHeader variant="staff" initialUser={initialUser} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

