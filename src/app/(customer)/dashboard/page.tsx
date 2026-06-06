import Link from 'next/link'
import { redirect } from 'next/navigation'

import { VenueHeader } from '@/components/patterns/venue-header'
import { getDashboardBookings } from '@/lib/actions/dashboard'
import { requireUser } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { DashboardClient } from './dashboard-client'

export default async function CustomerDashboardPage() {
  const user = await requireUser()
  if (user.role !== 'CUSTOMER') {
    redirect('/staff')
  }

  const [tenant, bookings] = await Promise.all([
    getTenant(),
    getDashboardBookings(),
  ])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-8 pt-6">
      <div className="flex items-center justify-between gap-2">
        <VenueHeader venueName={tenant.name} address={tenant.address} />
        <Link
          href="/book"
          className="shrink-0 text-xs font-medium text-[var(--color-action)]"
        >
          Book
        </Link>
      </div>
      <DashboardClient bookings={bookings} venueName={tenant.name} />
    </main>
  )
}
