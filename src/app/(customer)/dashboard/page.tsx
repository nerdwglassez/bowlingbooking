import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { ToastProvider } from '@/app/(customer)/book/toast-provider'
import { getDashboardBookings } from '@/lib/actions/dashboard'
import { requireUser } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

import { DashboardClient } from './dashboard-client'
import { DashboardPageChrome } from './dashboard-page-chrome'

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
    <ToastProvider>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-8 pt-6">
        <DashboardPageChrome
          venueName={tenant.name}
          address={tenant.address}
          userName={user.name ?? null}
          userEmail={user.email ?? ''}
        >
          <Suspense fallback={null}>
            <DashboardClient
              bookings={bookings}
              userName={user.name ?? null}
              userEmail={user.email ?? ''}
              checkInWindowMinutes={tenant.checkInWindowMinutes}
              venueAddress={tenant.address}
              venuePhone={tenant.phone}
            />
          </Suspense>
        </DashboardPageChrome>
      </main>
    </ToastProvider>
  )
}
