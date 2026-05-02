'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarDays, CircleDollarSign, Clock3, LayoutGrid, Plus } from 'lucide-react'
import CreateBookingModal from '@/components/staff/CreateBookingModal'
import StaffBookingsTable from '@/components/staff/StaffBookingsTable'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { EmptySearchBlock, LoadingStateBlock } from '@/components/shared/state/StateBlocks'
import {
  ManagementPanel,
  ManagementPanelHeader,
} from '@/components/shared/management/ManagementPanel'
import ManagementSearchField from '@/components/shared/management/ManagementSearchField'
import {
  buildStaffDashboardRowActions,
  canEditStaffReservation,
  type StaffDashboardBooking,
  getStaffCustomerDisplayName,
  getStaffSecondaryBookingDetail,
} from '@/lib/staff/dashboard'
import { useStaffDashboardData } from '@/hooks/useStaffDashboardData'

type Booking = StaffDashboardBooking

export default function StaffDashboardPage() {
  const router = useRouter()
  const [createBookingOpen, setCreateBookingOpen] = useState(false)
  const {
    loading,
    loadError,
    stats,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    filteredBookings,
    openActionsForId,
    setOpenActionsForId,
    refreshBookings,
  } = useStaffDashboardData()

  if (loading) {
    return <LoadingStateBlock />
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-rose-900 shadow-sm">
        <h2 className="text-lg font-semibold">Couldn&apos;t load today&apos;s bookings</h2>
        <p className="mt-2 text-sm text-rose-800/90">{loadError}</p>
        <p className="mt-4 text-sm text-rose-900/80">
          If you recently pulled code, run{' '}
          <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs font-mono text-rose-950">
            npx prisma migrate deploy
          </code>{' '}
          (or <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs font-mono text-rose-950">npm run db:push</code>)
          against the database in <code className="font-mono text-xs">DATABASE_URL</code>, then retry.
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => void refreshBookings()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-0 sm:px-0">
      <section className="relative -mt-6 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-gradient-to-r from-indigo-500 to-blue-500 px-6 pb-8 pt-6 text-white sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Bookings today',
                value: stats.bookingsToday,
                accent: 'text-white',
                icon: CalendarDays,
              },
              {
                label: 'Available lanes',
                value: stats.availableLanes,
                accent: 'text-white',
                icon: LayoutGrid,
              },
              {
                label: 'Checking in soon',
                value: stats.checkingInSoon,
                accent: 'text-white',
                icon: Clock3,
              },
              {
                label: 'Revenue today',
                value: `$${stats.revenueToday.toFixed(0)}`,
                accent: 'text-white',
                icon: CircleDollarSign,
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/20 bg-white/15 px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/20">
                  <card.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium tracking-wide text-indigo-100">{card.label}</p>
                <p className={`mt-1 text-3xl font-bold leading-[1.2] ${card.accent}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={() => setCreateBookingOpen(true)}
              variant="primary"
              rounded="full"
              className="min-h-[44px] gap-2 bg-white px-5 py-2 font-semibold text-indigo-700 shadow-[0_8px_20px_rgba(15,23,42,0.2)] hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              New booking
            </Button>
            <Link
              href="/staff/reports"
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Reporting
            </Link>
            <Link
              href="/staff/calendar"
              className="inline-flex min-h-[44px] items-center rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Calendar
            </Link>
          </div>
        </div>
      </section>

      <ManagementPanel data-testid="staff-dashboard-panel">
        <ManagementPanelHeader
          title="Today's schedule"
          description={format(new Date(), 'EEE, MMM d')}
          actions={
            <>
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="min-h-[42px] border-slate-300 bg-white py-2 text-slate-700"
                >
                  <option value="all">All statuses</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="checked">Checked in</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>
              <ManagementSearchField
                value={query}
                onChange={(value) => setQuery(value)}
                placeholder="Search by customer name, time, or lane"
                inputClassName="min-h-[44px]"
              />
            </>
          }
        />

        {filteredBookings.length === 0 ? (
          <EmptySearchBlock title="No reservations found matching your search." className="p-10" />
        ) : (
          <StaffBookingsTable
            rows={filteredBookings}
            getCustomerDisplayName={getStaffCustomerDisplayName}
            getSecondaryBookingDetail={getStaffSecondaryBookingDetail}
            getRowActions={(booking) =>
              buildStaffDashboardRowActions(booking, {
                canEditReservation: canEditStaffReservation,
                onDetails: (bookingId) => router.push(`/staff/bookings/${bookingId}`),
                onEdit: (bookingId) => router.push(`/staff/bookings/${bookingId}/edit`),
                onCheckIn: (bookingId) =>
                  router.push(`/staff/check-in?bookingId=${encodeURIComponent(bookingId)}`),
              })
            }
            openActionsForId={openActionsForId}
            onActionsOpenChange={(bookingId, nextOpen) => {
              setOpenActionsForId((current) => {
                if (nextOpen) return bookingId
                return current === bookingId ? null : current
              })
            }}
          />
        )}
      </ManagementPanel>

      {createBookingOpen && (
        <CreateBookingModal
          onClose={() => setCreateBookingOpen(false)}
          onCreated={(bookingId) => {
            setCreateBookingOpen(false)
            router.push(`/staff/bookings/${encodeURIComponent(bookingId)}`)
          }}
        />
      )}
    </div>
  )
}
