'use client'

// CockpitLaneGrid — 3-column lane status cards (staff-app-cockpit.html).

import Link from 'next/link'

import type { CockpitLaneCard } from '@/lib/actions/staff'

export type CockpitLaneGridProps = {
  lanes: CockpitLaneCard[]
  selectedLane?: number | null
  onSelectLane?: (lane: CockpitLaneCard) => void
}

const STATE_CLASS: Record<
  CockpitLaneCard['state'],
  { card: string; status: string; time?: string }
> = {
  available: {
    card: 'border-[color-mix(in_srgb,var(--status-ok-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-ok-bg)_8%,transparent)]',
    status: 'text-[var(--status-ok-text)]',
  },
  occupied: {
    card: 'border-[color-mix(in_srgb,var(--status-error-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_8%,transparent)]',
    status: 'text-[var(--status-error-text)]',
    time: 'text-[var(--status-error-text)]',
  },
  upcoming: {
    card: 'border-[color-mix(in_srgb,var(--color-action)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-action-subtle)_12%,transparent)]',
    status: 'text-[var(--color-action-dark)]',
    time: 'text-[var(--color-action-dark)]',
  },
  blocked: {
    card: 'border-[var(--color-border-strong)] bg-[var(--surface-sunken)]',
    status: 'text-[var(--color-text-secondary)]',
  },
}

export function CockpitLaneGrid({
  lanes,
  selectedLane,
  onSelectLane,
}: CockpitLaneGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {lanes.map((lane) => {
        const styles = STATE_CLASS[lane.state]
        const selected = selectedLane === lane.number
        const className = `flex flex-col rounded-[var(--radius-md)] border border-solid p-2.5 transition-transform ${styles.card} ${
          selected
            ? 'scale-[1.04] shadow-[0_0_0_2px_var(--color-action)]'
            : ''
        }`

        const inner = (
          <>
            <span className="text-lg leading-none [font-family:var(--font-display)] text-[var(--color-text-primary)]">
              {lane.number}
            </span>
            <span
              className={`mt-0.5 text-[9px] font-semibold uppercase tracking-wide ${styles.status}`}
            >
              {lane.statusLabel}
            </span>
            {lane.timeLabel ? (
              <span
                className={`mt-0.5 text-[10px] font-semibold ${styles.time ?? 'text-[var(--color-text-secondary)]'}`}
              >
                {lane.timeLabel}
              </span>
            ) : null}
            {lane.detail ? (
              <span className="mt-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">
                {lane.detail}
              </span>
            ) : null}
          </>
        )

        if (lane.bookingId) {
          return (
            <Link
              key={lane.number}
              href={`/staff/bookings/${lane.bookingId}`}
              className={className}
              onClick={() => onSelectLane?.(lane)}
            >
              {inner}
            </Link>
          )
        }

        return (
          <div key={lane.number} className={className}>
            {inner}
          </div>
        )
      })}
    </div>
  )
}
