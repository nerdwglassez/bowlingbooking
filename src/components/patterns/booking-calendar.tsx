'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { AvailableDate } from '@/lib/actions/booking'
import { formatCalendarMonthTitle } from '@/lib/booking-display'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

function toISODateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

type CalendarCell = {
  date: string
  day: number
  inMonth: boolean
  available: boolean
}

function buildMonthGrid(
  year: number,
  month: number,
  availabilityByDate: Map<string, boolean>,
): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: CalendarCell[] = []

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, i - startOffset + 1)
    cells.push({
      date: toISODateLocal(d),
      day: d.getDate(),
      inMonth: false,
      available: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const dateISO = toISODateLocal(d)
    cells.push({
      date: dateISO,
      day,
      inMonth: true,
      available: availabilityByDate.get(dateISO) ?? false,
    })
  }

  let trailing = 1
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, trailing++)
    cells.push({
      date: toISODateLocal(d),
      day: d.getDate(),
      inMonth: false,
      available: false,
    })
  }

  return cells
}

export type BookingCalendarProps = {
  year: number
  /** 0-indexed month (January = 0). */
  month: number
  dates: AvailableDate[]
  selectedDate: string | null
  onSelect: (date: string) => void
  onMonthChange: (year: number, month: number) => void
  loading?: boolean
  className?: string
}

export function BookingCalendar({
  year,
  month,
  dates,
  selectedDate,
  onSelect,
  onMonthChange,
  loading = false,
  className,
}: BookingCalendarProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const availabilityByDate = new Map(dates.map((d) => [d.date, d.available]))
  const monthTitle = formatCalendarMonthTitle(year, month)
  const cells = buildMonthGrid(year, month, availabilityByDate)

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    onMonthChange(next.getFullYear(), next.getMonth())
  }

  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span
          className="text-sm font-semibold text-[var(--color-text-primary)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {monthTitle}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label) => (
          <span
            key={label}
            className="py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
          >
            {label}
          </span>
        ))}

        {loading
          ? Array.from({ length: 42 }, (_, i) => (
              <Skeleton key={`sk-${i}`} className="aspect-square w-full" />
            ))
          : cells.map((cell) => {
              const cellDate = new Date(`${cell.date}T12:00:00`)
              const selected = selectedDate === cell.date
              const isToday = isSameDay(cellDate, today)
              const disabled = !cell.inMonth || !cell.available

              let cellClass =
                'flex aspect-square w-full items-center justify-center rounded-[var(--radius-md)] text-sm font-medium transition-colors'

              if (!cell.inMonth) {
                cellClass = cn(
                  cellClass,
                  'text-[var(--color-text-muted)] opacity-40',
                )
              } else if (selected) {
                cellClass = cn(
                  cellClass,
                  'bg-[var(--color-action)] text-[var(--color-text-on-action)]',
                )
              } else if (disabled) {
                cellClass = cn(
                  cellClass,
                  'cursor-not-allowed text-[var(--color-text-muted)] opacity-50',
                )
              } else if (isToday) {
                cellClass = cn(
                  cellClass,
                  'border border-[var(--color-border)] text-[var(--color-text-primary)]',
                  'hover:bg-[var(--color-action-subtle)]',
                )
              } else {
                cellClass = cn(
                  cellClass,
                  'text-[var(--color-text-primary)] hover:bg-[var(--color-action-subtle)]',
                )
              }

              return (
                <button
                  key={`${cell.date}-${cell.inMonth}`}
                  type="button"
                  disabled={disabled}
                  aria-label={cell.date}
                  aria-current={isToday ? 'date' : undefined}
                  className={cellClass}
                  onClick={() => {
                    if (!disabled) onSelect(cell.date)
                  }}
                >
                  {cell.day}
                </button>
              )
            })}
      </div>
    </div>
  )
}
