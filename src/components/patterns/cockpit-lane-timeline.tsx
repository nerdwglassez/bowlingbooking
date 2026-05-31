'use client'

// CockpitLaneTimeline — lane rows with booking blocks + now line (staff-app-v2.html).

import Link from 'next/link'

import type {
  CockpitTimeline,
  CockpitTimeWindow,
} from '@/lib/cockpit-display'

export type CockpitLaneTimelineProps = {
  timeline: CockpitTimeline
  totalLanes: number
  timeWindow: CockpitTimeWindow
  onTimeWindowChange: (window: CockpitTimeWindow) => void
  onLaneSelect?: (laneNumber: number) => void
}

const TIME_WINDOWS: { value: CockpitTimeWindow; label: string }[] = [
  { value: 2, label: '2 hr' },
  { value: 4, label: '4 hr' },
  { value: 8, label: '8 hr' },
  { value: 'day', label: 'Day' },
]

const BLOCK_CLASS: Record<
  'occupied' | 'upcoming' | 'completed',
  string
> = {
  occupied:
    'border-[color-mix(in_srgb,var(--status-error-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_25%,transparent)] text-[var(--status-error-text)]',
  upcoming:
    'border-[color-mix(in_srgb,var(--color-action)_50%,transparent)] bg-[color-mix(in_srgb,var(--color-action-subtle)_20%,transparent)] text-[var(--color-action-dark)]',
  completed:
    'border-[var(--color-border)] bg-[color-mix(in_srgb,var(--surface-sunken)_30%,transparent)] text-[var(--color-text-secondary)]',
}

export function CockpitLaneTimeline({
  timeline,
  totalLanes,
  timeWindow,
  onTimeWindowChange,
  onLaneSelect,
}: CockpitLaneTimelineProps) {
  const scrollHint = totalLanes > 12

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between py-2">
        <span className="text-[10px] text-[var(--color-text-secondary)]">
          Time window
        </span>
        <div className="flex gap-1">
          {TIME_WINDOWS.map((chip) => {
            const active = timeWindow === chip.value
            return (
              <button
                key={chip.label}
                type="button"
                className={`rounded-[var(--radius-full)] border border-solid px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  active
                    ? 'border-[var(--color-border-strong)] bg-[var(--surface-raised)] text-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] bg-[var(--surface-card)] text-[var(--color-text-secondary)]'
                }`}
                onClick={() => onTimeWindowChange(chip.value)}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-hidden">
        <div className="mb-1.5 flex">
          <div className="w-9 shrink-0" aria-hidden />
          <div className="flex flex-1">
            {timeline.hourLabels.map((hour, index) => (
              <div
                key={`${hour.label}-${index}`}
                className={`flex-1 text-center text-[8px] font-semibold tracking-wide ${
                  hour.isNow
                    ? 'text-[var(--color-action)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                {hour.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {timeline.lanes.map((lane) => (
            <div key={lane.number} className="flex items-center">
              <button
                type="button"
                className="w-9 shrink-0 pr-1.5 text-right text-[11px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-action)]"
                onClick={() => onLaneSelect?.(lane.number)}
              >
                {lane.number}
              </button>

              {lane.blocked ? (
                <div className="relative h-[22px] flex-1 overflow-hidden rounded border border-solid border-[var(--color-border-strong)] bg-[var(--surface-sunken)]">
                  <span className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                    Blocked · {lane.blocked.reason}
                  </span>
                </div>
              ) : (
                <div className="relative h-[22px] flex-1 overflow-hidden rounded border border-solid border-[var(--color-border)] bg-[var(--surface-card)]">
                  <div
                    className="absolute bottom-0 top-0 z-[2] w-px bg-[var(--color-action)]"
                    style={{ left: `${timeline.nowPercent}%` }}
                    aria-hidden
                  >
                    <span className="absolute -left-[3px] -top-[3px] size-[7px] rounded-full bg-[var(--color-action)]" />
                  </div>

                  {lane.blocks.map((block) => (
                    <Link
                      key={`${lane.number}-${block.bookingId}`}
                      href={`/staff/bookings/${block.bookingId}`}
                      className={`absolute bottom-0.5 top-0.5 z-[1] flex items-center overflow-hidden rounded-[3px] border border-solid px-1 text-[9px] font-semibold ${BLOCK_CLASS[block.state]}`}
                      style={{
                        left: `${block.leftPercent}%`,
                        width: `${Math.max(block.widthPercent, 4)}%`,
                      }}
                    >
                      {block.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {scrollHint ? (
          <p className="py-1.5 text-center text-[10px] text-[var(--color-text-secondary)]">
            ↓ Lanes 13–{totalLanes} · scroll to see more
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2.5 pb-2 pt-1">
        <LegendItem
          className="bg-[color-mix(in_srgb,var(--status-error-bg)_25%,transparent)] border-[color-mix(in_srgb,var(--status-error-border)_60%,transparent)]"
          label="Active"
        />
        <LegendItem
          className="bg-[color-mix(in_srgb,var(--color-action-subtle)_20%,transparent)] border-[color-mix(in_srgb,var(--color-action)_50%,transparent)]"
          label="Upcoming"
        />
        <LegendItem
          className="bg-[color-mix(in_srgb,var(--surface-sunken)_30%,transparent)] border-[var(--color-border)]"
          label="Done"
        />
        <LegendItem
          className="bg-[var(--surface-sunken)] border-[var(--color-border-strong)]"
          label="Blocked"
        />
      </div>
    </div>
  )
}

function LegendItem({
  className,
  label,
}: {
  className: string
  label: string
}) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={`size-[7px] shrink-0 rounded-[2px] border border-solid ${className}`}
        aria-hidden
      />
      <span className="text-[9px] text-[var(--color-text-secondary)]">
        {label}
      </span>
    </div>
  )
}
