'use client'

import Link from 'next/link'

import { Button } from '@/components/base/buttons/button'
import { cx } from '@/lib/cx'
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
  onOpenBooking?: (bookingId: string) => void
}

const TIME_WINDOWS: { value: CockpitTimeWindow; label: string }[] = [
  { value: 2, label: '2 hr' },
  { value: 4, label: '4 hr' },
  { value: 8, label: '8 hr' },
  { value: 'day', label: 'Day' },
]

const BLOCK_CLASS: Record<'occupied' | 'upcoming' | 'completed', string> = {
  occupied: 'border-error bg-error-secondary text-error-primary',
  upcoming: 'border-brand bg-brand-primary text-brand-secondary',
  completed: 'border-secondary bg-secondary text-tertiary',
}

export function CockpitLaneTimeline({
  timeline,
  totalLanes,
  timeWindow,
  onTimeWindowChange,
  onLaneSelect,
  onOpenBooking,
}: CockpitLaneTimelineProps) {
  const scrollHint = totalLanes > 12

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-secondary">Time window</span>
        <div className="flex flex-wrap gap-1">
          {TIME_WINDOWS.map((chip) => {
            const active = timeWindow === chip.value
            return (
              <Button
                key={chip.label}
                type="button"
                size="sm"
                color={active ? 'secondary' : 'tertiary'}
                onClick={() => onTimeWindowChange(chip.value)}
              >
                {chip.label}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="mb-1.5 flex min-w-[640px]">
          <div className="w-10 shrink-0" aria-hidden />
          <div className="flex flex-1">
            {timeline.hourLabels.map((hour, index) => (
              <div
                key={`${hour.label}-${index}`}
                className={cx(
                  'flex-1 text-center text-xs font-semibold',
                  hour.isNow ? 'text-brand-secondary' : 'text-tertiary',
                )}
              >
                {hour.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-w-[640px] flex-col gap-1">
          {timeline.lanes.map((lane) => (
            <div key={lane.number} className="flex items-center">
              <button
                type="button"
                className="min-h-11 w-10 shrink-0 pr-1.5 text-right text-sm font-semibold text-tertiary hover:text-brand-secondary"
                onClick={() => onLaneSelect?.(lane.number)}
              >
                {lane.number}
              </button>

              {lane.blocked ? (
                <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-secondary ring-1 ring-secondary ring-inset">
                  <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-tertiary">
                    Blocked · {lane.blocked.reason}
                  </span>
                </div>
              ) : (
                <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-primary ring-1 ring-secondary ring-inset">
                  <div
                    className="absolute inset-y-0 z-[2] w-px bg-brand-solid"
                    style={{ left: `${timeline.nowPercent}%` }}
                    aria-hidden
                  >
                    <span className="absolute -top-0.5 -left-1 size-2 rounded-full bg-brand-solid" />
                  </div>

                  {lane.blocks.map((block) => {
                    const blockClass = cx(
                      'absolute inset-y-0.5 z-[1] flex items-center overflow-hidden rounded-md border px-1 text-xs font-semibold',
                      BLOCK_CLASS[block.state],
                    )
                    const blockStyle = {
                      left: `${block.leftPercent}%`,
                      width: `${Math.max(block.widthPercent, 4)}%`,
                    }
                    return onOpenBooking ? (
                      <button
                        key={`${lane.number}-${block.bookingId}`}
                        type="button"
                        className={blockClass}
                        style={blockStyle}
                        onClick={() => onOpenBooking(block.bookingId)}
                      >
                        {block.label}
                      </button>
                    ) : (
                      <Link
                        key={`${lane.number}-${block.bookingId}`}
                        href={`/staff/bookings/${block.bookingId}`}
                        className={blockClass}
                        style={blockStyle}
                      >
                        {block.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {scrollHint ? (
          <p className="py-2 text-center text-sm text-tertiary">
            Lanes 13–{totalLanes} · scroll to see more
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 pb-2">
        <LegendItem className="border-error bg-error-secondary" label="Active" />
        <LegendItem
          className="border-brand bg-brand-primary"
          label="Upcoming"
        />
        <LegendItem className="border-secondary bg-secondary" label="Done" />
        <LegendItem className="border-secondary bg-secondary" label="Blocked" />
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
    <div className="flex items-center gap-1.5">
      <span
        className={cx('size-2.5 shrink-0 rounded-sm border', className)}
        aria-hidden
      />
      <span className="text-xs text-tertiary">{label}</span>
    </div>
  )
}
