'use client'

// CockpitLateActions — quick actions when late bookings exist (staff-stat-hierarchy.html).

import Link from 'next/link'

export type CockpitLateActionsProps = {
  firstLateBookingId: string
  onOpenBooking?: (bookingId: string) => void
}

const CHECK_IN_CLASS =
  'flex-1 rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--status-ok-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--status-ok-bg)_12%,transparent)] px-2.5 py-2 text-center text-[11px] font-semibold text-[var(--status-ok-text)]'

const CANCEL_CLASS =
  'flex-1 rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--status-error-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_10%,transparent)] px-2.5 py-2 text-center text-[11px] font-semibold text-[var(--status-error-text)]'

export function CockpitLateActions({
  firstLateBookingId,
  onOpenBooking,
}: CockpitLateActionsProps) {
  if (onOpenBooking) {
    return (
      <div className="flex gap-1.5">
        <button
          type="button"
          className={CHECK_IN_CLASS}
          onClick={() => onOpenBooking(firstLateBookingId)}
        >
          ✓ Check in late arrivals
        </button>
        <button
          type="button"
          className={CANCEL_CLASS}
          onClick={() => onOpenBooking(firstLateBookingId)}
        >
          ✕ Cancel to free lanes
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-1.5">
      <Link href={`/staff/bookings/${firstLateBookingId}`} className={CHECK_IN_CLASS}>
        ✓ Check in late arrivals
      </Link>
      <Link href={`/staff/bookings/${firstLateBookingId}`} className={CANCEL_CLASS}>
        ✕ Cancel to free lanes
      </Link>
    </div>
  )
}
