// /staff — cockpit page.
//
// Server Component. Reads today's bookings via getTodayBookings and renders
// them as BookingListRow entries. (staff)/layout.tsx already enforces role.

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { BookingListRow } from '@/components/patterns/booking-list-row'
import { EmptyState } from '@/components/patterns/empty-state'
import { getTodayBookings } from '@/lib/actions/staff'
import { getTenant } from '@/lib/tenant'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

export default async function StaffCockpitPage() {
  const tenant = await getTenant()
  const bookings = await getTodayBookings(tenant.id)

  const today = new Date()
  const totalBowlers = bookings
    .filter((b) => b.status === 'CONFIRMED')
    .reduce((acc, b) => acc + b.bowlerCount, 0)

  return (
    <>
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Cockpit</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {DATE_FORMATTER.format(today)} · {bookings.length} booking
            {bookings.length === 1 ? '' : 's'} · {totalBowlers} bowler
            {totalBowlers === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/staff/walkin">New walk-in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/staff/schedule">Schedule</Link>
          </Button>
        </div>
      </header>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet today"
          description="Anything booked online or by walk-in will appear here automatically."
          action={
            <Button asChild>
              <Link href="/staff/walkin">Create walk-in</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {bookings.map((b) => (
            <li key={b.id}>
              <BookingListRow
                id={b.id}
                href={`/staff/bookings/${b.id}`}
                confirmationCode={b.confirmationCode}
                startTime={b.startTime}
                endTime={b.endTime}
                customerName={b.customerName}
                bowlerCount={b.bowlerCount}
                laneCount={b.laneCount}
                packageName={b.packageName}
                totalAmount={b.totalAmount}
                status={b.status}
                source={b.source}
                isRefunded={b.isRefunded}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
