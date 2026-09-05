'use client'

export type CockpitContextBarProps = {
  dateLabel: string
}

export function CockpitContextBar({ dateLabel }: CockpitContextBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-secondary">
        Today&apos;s bookings
      </span>
      <span className="text-sm text-tertiary">{dateLabel}</span>
    </div>
  )
}
