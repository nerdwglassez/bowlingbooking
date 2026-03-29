import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTierFromPoints } from '@/lib/loyalty'
import Link from 'next/link'
import { format } from 'date-fns'
import AppExperienceHeader from '@/components/layout/AppExperienceHeader'

export default async function DashboardPage() {
  const session = await requireAuth()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      loyaltyPoints: true,
    },
  })

  if (!user) {
    redirect('/login')
  }

  if (user.role === 'STAFF' || user.role === 'MANAGER' || user.role === 'ADMIN') {
    redirect(user.role === 'ADMIN' ? '/admin' : '/staff')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      date: { gte: today },
      status: { not: 'CANCELLED' },
    },
    include: {
      bookingPackages: { include: { package: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    take: 5,
  })

  const hasUpcoming = upcomingBookings.length > 0

  const headerUser = {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppExperienceHeader variant="booking" initialUser={headerUser} />
      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
        </div>

        {/* Loyalty points card */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-1">Loyalty rewards</h2>
          <p className="text-amber-800 text-sm mb-3">
            Earn 1 point per $1 spent. Redeem 100 points for $5 off your next booking.
          </p>
          <div className="flex items-baseline gap-4">
            <span className="text-2xl font-bold text-amber-900">{user.loyaltyPoints ?? 0} points</span>
            <span className="text-sm font-medium text-amber-700">
              {getTierFromPoints(user.loyaltyPoints ?? 0)} tier
            </span>
          </div>
        </div>

        {!hasUpcoming && (
          <div className="bg-white rounded-xl shadow-md p-8 mb-6 text-center border-2 border-dashed border-gray-200">
            <p className="text-lg text-gray-600 mb-6">No reservations yet</p>
            <p className="text-gray-500 text-sm mb-6">
              Book a lane to get started. You can view past activity here once you have completed bookings.
            </p>
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition"
            >
              Book a Lane
            </Link>
          </div>
        )}

        {hasUpcoming && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Reservations</h2>
            <ul className="space-y-3">
              {upcomingBookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(new Date(b.date), 'EEE, MMM d, yyyy')} at {b.startTime}
                    </p>
                    <p className="text-sm text-gray-600">
                      Lane {b.lane} · {b.numBowlers} bowler{b.numBowlers !== 1 ? 's' : ''}
                      {b.bookingPackages.length > 0 &&
                        ` · ${b.bookingPackages.map((bp) => bp.package.name).join(', ')}`}
                    </p>
                  </div>
                  <Link
                    href={`/bookings/${b.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View Details
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/bookings"
              className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              View all bookings →
            </Link>
          </div>
        )}

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
            <Link
              href="/gift-cards"
              className="block p-6 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition"
            >
              <h3 className="font-semibold text-lg mb-2">Buy gift card</h3>
              <p className="text-gray-600 text-sm">Purchase a gift card for lane booking</p>
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

