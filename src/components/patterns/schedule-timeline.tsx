// ScheduleTimeline — single-day horizontal timeline view used by /staff/schedule.
//
// Server-safe. Controlled — all data via props.
//
// Layout:
//   • One row per hour from `dayStartHour` to `dayEndHour`.
//   • Each hour shows booking blocks + blocked slots that intersect it.
//   • Blocks are colored by source/status; refunded/cancelled are muted.

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
})

export interface ScheduleBookingItem {
  id: string
  href?: string
  startTime: Date
  endTime: Date
  customerName: string
  bowlerCount: number
  laneCount: number
  source: 'ONLINE' | 'WALK_IN' | 'PHONE'
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'HOLD'
  isRefunded?: boolean
}

export interface ScheduleBlockItem {
  id: string
  startTime: Date
  endTime: Date
  reason: string | null
  /** Lane numbers blocked. Empty = all lanes. */
  lanes: number[]
}

export interface ScheduleTimelineProps {
  /** The date being shown (used for the "no items" message). */
  dateISO: string
  bookings: ScheduleBookingItem[]
  blocks: ScheduleBlockItem[]
  dayStartHour?: number
  dayEndHour?: number
}

export function ScheduleTimeline({
  bookings,
  blocks,
  dayStartHour = 10,
  dayEndHour = 24,
}: ScheduleTimelineProps) {
  const hours = Array.from(
    { length: dayEndHour - dayStartHour },
    (_, i) => dayStartHour + i,
  )

  const allItems = [
    ...bookings.map((b) => ({
      kind: 'booking' as const,
      ...b,
    })),
    ...blocks.map((b) => ({
      kind: 'block' as const,
      ...b,
    })),
  ]

  return (
    <ul className="flex flex-col gap-0">
      {hours.map((hour) => {
        const hourStart = new Date()
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date(hourStart)
        hourEnd.setHours(hour + 1)

        const items = allItems.filter(
          (it) => it.startTime < hourEnd && it.endTime > hourStart,
        )

        return (
          <li
            key={hour}
            className="flex gap-4 border-t border-solid border-[var(--color-border)] py-3"
          >
            <span className="w-14 shrink-0 text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              {TIME_FORMATTER.format(hourStart).toLowerCase()}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              {items.length === 0 ? (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  —
                </span>
              ) : (
                items.map((item) =>
                  item.kind === 'booking' ? (
                    <ScheduleBookingBlock
                      key={`b-${item.id}`}
                      item={item as ScheduleBookingItem}
                    />
                  ) : (
                    <ScheduleBlockBlock
                      key={`x-${item.id}`}
                      item={item as ScheduleBlockItem}
                    />
                  ),
                )
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const BLOCK_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function ScheduleBookingBlock({ item }: { item: ScheduleBookingItem }) {
  const muted = item.status === 'CANCELLED' || item.isRefunded
  const body = (
    <div
      data-muted={muted ? '' : undefined}
      className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm data-[muted]:opacity-60"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[var(--color-text-primary)]">
          {item.customerName}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {BLOCK_TIME.format(item.startTime)} – {BLOCK_TIME.format(item.endTime)} · {item.bowlerCount} bowlers · {item.laneCount} lane
          {item.laneCount === 1 ? '' : 's'}
        </span>
      </div>
      <Badge variant={item.source === 'WALK_IN' ? 'info' : 'default'}>
        {item.source === 'WALK_IN' ? 'Walk-in' : 'Online'}
      </Badge>
    </div>
  )
  if (item.href) {
    return (
      <Link
        href={item.href}
        className="block transition-colors hover:[&_div]:bg-[var(--surface-sunken)]"
      >
        {body}
      </Link>
    )
  }
  return body
}

function ScheduleBlockBlock({ item }: { item: ScheduleBlockItem }) {
  const laneLabel =
    item.lanes.length === 0
      ? 'All lanes'
      : `Lane${item.lanes.length === 1 ? '' : 's'} ${item.lanes.join(', ')}`
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-solid border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-sm text-[var(--status-warning-text)]">
      <div className="flex flex-col gap-0.5">
        <span>{item.reason ?? 'Blocked'}</span>
        <span className="text-xs opacity-80">
          {BLOCK_TIME.format(item.startTime)} – {BLOCK_TIME.format(item.endTime)} · {laneLabel}
        </span>
      </div>
      <Badge variant="warning">Block</Badge>
    </div>
  )
}
