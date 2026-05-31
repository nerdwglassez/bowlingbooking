'use client'

// CockpitUpcomingList — upcoming + late row styling (staff-stat-hierarchy.html).

import Link from 'next/link'

import type { CockpitBookingRow } from '@/lib/actions/staff'
import {
  formatBookingMeta,
  formatLaneBadge,
  formatLateMeta,
  formatUpcomingTimeParts,
} from '@/lib/cockpit-display'

export type CockpitUpcomingListProps = {
  bookings: CockpitBookingRow[]
  emptyQuery?: string | null
  referenceNow: string
}

const PIP_CLASS: Record<CockpitBookingRow['listStatus'], string> = {
  pending: 'bg-[var(--color-action)]',
  confirmed: 'bg-[var(--color-text-secondary)]',
  checkedin: 'bg-[var(--status-ok-text)]',
  payment: 'bg-[var(--status-error-text)]',
  late: 'animate-pulse bg-[var(--status-error-text)]',
}

export function CockpitUpcomingList({
  bookings,
  emptyQuery,
  referenceNow,
}: CockpitUpcomingListProps) {
  const now = new Date(referenceNow)

  if (bookings.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">
        {emptyQuery
          ? `No bookings match “${emptyQuery}”`
          : 'No upcoming bookings today.'}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {bookings.map((booking) => {
        const { hour, ampm } = formatUpcomingTimeParts(booking.startTime)
        const checkedIn = booking.listStatus === 'checkedin'
        const paymentPending = booking.listStatus === 'payment'
        const late = booking.listStatus === 'late'

        return (
          <li key={booking.id}>
            <Link
              href={`/staff/bookings/${booking.id}`}
              className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border border-solid bg-[var(--surface-card)] px-3 py-2.5 transition-colors hover:border-[var(--color-border-strong)] ${
                late
                  ? 'border-[color-mix(in_srgb,var(--status-error-border)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_4%,transparent)]'
                  : paymentPending
                    ? 'border-[color-mix(in_srgb,var(--status-error-border)_30%,transparent)]'
                    : 'border-[var(--color-border)]'
              } ${checkedIn ? 'opacity-50' : ''}`}
            >
              <div className="min-w-[44px] text-center">
                <div
                  className={`text-sm [font-family:var(--font-display)] ${
                    late
                      ? 'text-[var(--status-error-text)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {hour}
                </div>
                <div className="text-[9px] text-[var(--color-text-secondary)]">
                  {ampm}
                </div>
              </div>

              <span
                className={`h-8 w-px shrink-0 ${
                  late
                    ? 'bg-[color-mix(in_srgb,var(--status-error-border)_30%,transparent)]'
                    : 'bg-[var(--color-border)]'
                }`}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <p
                  className={`text-[13px] font-medium ${
                    late
                      ? 'text-[var(--status-error-text)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {booking.customerName}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                  {late
                    ? formatLateMeta(booking, now)
                    : formatBookingMeta(booking)}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-[var(--radius-full)] border border-solid border-[var(--color-border)] bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                  {formatLaneBadge(booking.laneNumbers)}
                </span>
                <span
                  className={`size-2 rounded-full ${PIP_CLASS[booking.listStatus]}`}
                  aria-hidden
                />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
