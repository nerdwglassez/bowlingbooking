'use client'

import { CalendarColumnHeader } from '@/components/application/calendar/base-components/calendar-column-header'
import { CalendarMonthViewCell } from '@/components/application/calendar/base-components/calendar-month-view-cell'
import {
  CalendarMonthViewEvent,
  type EventViewColor,
} from '@/components/application/calendar/base-components/calendar-month-view-event'
import { cx } from '@/lib/cx'
import type { ScheduleDaySummary } from '@/lib/actions/staff'
import { buildMonthGrid } from '@/lib/schedule-display'

export type ScheduleMonthCalendarProps = {
  year: number
  month: number
  days: ScheduleDaySummary[]
  selectedDate: string
  todayISO: string
  onSelectDate: (dateISO: string) => void
  onAddBlock?: (dateISO: string) => void
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MAX_EVENTS_PER_CELL = 2

function daySummary(
  days: ScheduleDaySummary[],
  dateISO: string,
): ScheduleDaySummary | undefined {
  return days.find((d) => d.dateISO === dateISO)
}

function densityColor(level: ScheduleDaySummary['densityLevel']): EventViewColor {
  switch (level) {
    case 'full':
      return 'orange'
    case 'busy':
      return 'brand'
    default:
      return 'green'
  }
}

function cellEvents(summary: ScheduleDaySummary | undefined): {
  label: string
  color: EventViewColor
}[] {
  if (!summary) return []
  const events: { label: string; color: EventViewColor }[] = []
  if (summary.bookingCount > 0) {
    events.push({
      label:
        summary.bookingCount === 1
          ? '1 booking'
          : `${summary.bookingCount} bookings`,
      color: densityColor(summary.densityLevel),
    })
  }
  if (summary.blockLevel === 'partial' || summary.blockLevel === 'full') {
    events.push({
      label: summary.blockLevel === 'full' ? 'Blocked' : 'Partial block',
      color: 'gray',
    })
  }
  return events
}

export function ScheduleMonthCalendar({
  year,
  month,
  days,
  selectedDate,
  todayISO,
  onSelectDate,
  onAddBlock,
}: ScheduleMonthCalendarProps) {
  const cells = buildMonthGrid(year, month)
  const rowClass =
    cells.length > 35
      ? 'grid-rows-6'
      : cells.length > 28
        ? 'grid-rows-5'
        : 'grid-rows-4'

  return (
    <div
      role="grid"
      aria-label="Month occupancy calendar"
      className="isolate flex flex-col"
    >
      <div className="grid grid-cols-7">
        {DOW.map((label) => (
          <CalendarColumnHeader
            key={label}
            weekDay={label}
            className="before:border-b"
          />
        ))}
      </div>

      <div className={cx('grid flex-1 grid-cols-7', rowClass)}>
        {cells.map((cell, index) => {
          const summary = daySummary(days, cell.dateISO)
          const isSelected = selectedDate === cell.dateISO
          const isToday = todayISO === cell.dateISO
          const isLastRow =
            cells.length > 35
              ? index >= 35
              : cells.length > 28
                ? index >= 28
                : index >= 21
          const isLastColumn = (index + 1) % 7 === 0
          const events = cellEvents(summary)
          const shown = events.slice(0, MAX_EVENTS_PER_CELL)
          const remaining = Math.max(0, events.length - MAX_EVENTS_PER_CELL)

          return (
            <CalendarMonthViewCell
              key={`${cell.dateISO}-${cell.inMonth}`}
              day={cell.day}
              isDisabled={!cell.inMonth}
              state={
                isSelected ? 'selected' : isToday ? 'current' : 'default'
              }
              className={cx(
                isLastRow && 'before:border-b-0',
                isLastColumn && 'before:border-r-0',
              )}
              addEventLabel="Block"
              onAddEvent={
                cell.inMonth && onAddBlock
                  ? () => onAddBlock(cell.dateISO)
                  : undefined
              }
              onClick={() => {
                if (cell.inMonth) onSelectDate(cell.dateISO)
              }}
            >
              <div className="flex gap-1 max-md:pl-1 md:flex-col">
                {shown.map((event) => (
                  <CalendarMonthViewEvent
                    key={event.label}
                    label={event.label}
                    color={event.color}
                    collapseOnMobile
                  />
                ))}
              </div>
              {remaining > 0 ? (
                <div className="truncate text-xs font-semibold text-utility-neutral-500 max-md:pl-1">
                  {remaining} more...
                </div>
              ) : null}
            </CalendarMonthViewCell>
          )
        })}
      </div>
    </div>
  )
}
