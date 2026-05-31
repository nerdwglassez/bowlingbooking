'use client'

// CockpitLateActions — quick actions when late bookings exist (staff-stat-hierarchy.html).

import Link from 'next/link'

export type CockpitLateActionsProps = {
  firstLateBookingId: string
}

export function CockpitLateActions({
  firstLateBookingId,
}: CockpitLateActionsProps) {
  return (
    <div className="flex gap-1.5">
      <Link
        href={`/staff/bookings/${firstLateBookingId}`}
        className="flex-1 rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--status-ok-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--status-ok-bg)_12%,transparent)] px-2.5 py-2 text-center text-[11px] font-semibold text-[var(--status-ok-text)]"
      >
        ✓ Check in late arrivals
      </Link>
      <Link
        href={`/staff/bookings/${firstLateBookingId}`}
        className="flex-1 rounded-[var(--radius-md)] border border-solid border-[color-mix(in_srgb,var(--status-error-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_10%,transparent)] px-2.5 py-2 text-center text-[11px] font-semibold text-[var(--status-error-text)]"
      >
        ✕ Cancel to free lanes
      </Link>
    </div>
  )
}
