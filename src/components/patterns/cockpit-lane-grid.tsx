'use client'

import Link from 'next/link'

import { cx } from '@/lib/cx'
import type { CockpitLaneCard } from '@/lib/actions/staff'

export type CockpitLaneGridProps = {
  lanes: CockpitLaneCard[]
  selectedLane?: number | null
  onSelectLane?: (lane: CockpitLaneCard) => void
}

const STATE_CLASS: Record<
  CockpitLaneCard['state'],
  { card: string; status: string }
> = {
  available: {
    card: 'ring-success',
    status: 'text-success-primary',
  },
  occupied: {
    card: 'ring-error',
    status: 'text-error-primary',
  },
  upcoming: {
    card: 'ring-brand',
    status: 'text-brand-secondary',
  },
  blocked: {
    card: 'ring-secondary bg-secondary',
    status: 'text-tertiary',
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
        const className = cx(
          'flex flex-col rounded-xl bg-primary p-2.5 ring-1 ring-inset transition-transform',
          styles.card,
          selected && 'scale-[1.04] ring-2 ring-brand',
        )

        const inner = (
          <>
            <span className="text-lg leading-none [font-family:var(--font-display)] text-primary">
              {lane.number}
            </span>
            <span
              className={cx(
                'mt-0.5 text-xs font-semibold uppercase tracking-wide',
                styles.status,
              )}
            >
              {lane.statusLabel}
            </span>
            {lane.timeLabel ? (
              <span className={cx('mt-0.5 text-xs font-semibold', styles.status)}>
                {lane.timeLabel}
              </span>
            ) : null}
            {lane.detail ? (
              <span className="mt-1 text-xs leading-snug text-tertiary">
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
