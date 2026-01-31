import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'
import UserNav from '@/components/layout/UserNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth('ADMIN')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav - User Info */}
      <UserNav />

      {/* Bottom Nav - Page Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex-shrink-0">
              <Link href="/admin" className="text-xl font-bold text-blue-600">
                Admin Panel
              </Link>
            </div>
            <div className="flex-1 flex items-center justify-center space-x-1 sm:space-x-4 overflow-x-auto">
              <Link
                href="/staff"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                Staff Dashboard
              </Link>
              <Link
                href="/staff/bookings"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                All Bookings
              </Link>
              <Link
                href="/staff/bookings/create"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                Create Booking
              </Link>
              <Link
                href="/staff/check-in"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                Check In
              </Link>
              <Link
                href="/admin/operating-hours"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                Operating Hours
              </Link>
              <Link
                href="/admin/lane-blocks"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                Lane Blocks
              </Link>
              <Link
                href="/admin/packages"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                Packages
              </Link>
              <Link
                href="/admin/settings"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

