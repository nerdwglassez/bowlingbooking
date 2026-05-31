'use client'

// CockpitContextBar — "Today's bookings" + date row (staff-stat-hierarchy.html).

export type CockpitContextBarProps = {
  dateLabel: string
}

export function CockpitContextBar({ dateLabel }: CockpitContextBarProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
        Today&apos;s bookings
      </span>
      <span className="text-[11px] text-[var(--color-text-secondary)]">
        {dateLabel}
      </span>
    </div>
  )
}
