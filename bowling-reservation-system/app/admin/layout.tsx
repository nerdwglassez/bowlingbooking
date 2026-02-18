import { requireAuth } from '@/lib/auth'
import UserNav from '@/components/layout/UserNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth('ADMIN')

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNav />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

