import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import UserNav from '@/components/layout/UserNav'

export default async function DashboardPage() {
  const session = await requireAuth()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  // Role-based redirects
  if (user.role === 'STAFF' || user.role === 'ADMIN') {
    redirect(`/${user.role.toLowerCase()}`)
  }

  // Customer dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <UserNav />
      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/book"
              className="block p-6 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <h3 className="font-semibold text-lg mb-2">Book a Lane</h3>
              <p className="text-gray-600 text-sm">Reserve a lane for your next visit</p>
            </Link>

            <Link
              href="/bookings"
              className="block p-6 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-lg mb-2">My Bookings</h3>
              <p className="text-gray-600 text-sm">View and manage your reservations</p>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Account Type</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role.toLowerCase()}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  )
}

