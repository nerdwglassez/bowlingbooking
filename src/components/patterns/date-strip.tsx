'use client'

import { CalendarDays } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AvailableDate } from '@/lib/actions/booking'

export type DateStripProps = {
  dates: AvailableDate[]
  selectedDate: string | null
  onSelect: (date: string) => void
  /** When set, renders a trailing control to open the full calendar (mobile). */
  onOpenCalendar?: () => void
  className?: string
}

export function DateStrip({
  dates,
  selectedDate,
  onSelect,
  onOpenCalendar,
  className,
}: DateStripProps) {
  return (
    <div
      role="listbox"
      aria-label="Choose a date"
      className={['flex gap-2 overflow-x-auto pb-2', className]
        .filter(Boolean)
        .join(' ')}
    >
      {dates.map((d) => {
        const selected = selectedDate === d.date
        return (
          <Button
            key={d.date}
            role="option"
            aria-selected={selected}
            disabled={!d.available}
            variant={selected ? 'primary' : 'secondary'}
            size="md"
            onClick={() => onSelect(d.date)}
            className="h-auto w-14 shrink-0 flex-col px-3 py-2"
          >
            <span className="text-xs uppercase tracking-wide">{d.weekday}</span>
            <span className="text-lg font-semibold">{d.day}</span>
          </Button>
        )
      })}
      {onOpenCalendar ? (
        <button
          type="button"
          onClick={onOpenCalendar}
          className={[
            'flex min-w-[5rem] shrink-0 flex-col items-center justify-center gap-0.5',
            'rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)]',
            'bg-[var(--color-action-subtle)] px-3 py-2 text-[11px] font-medium',
            'text-[var(--color-action)] transition-colors',
            'hover:border-[var(--color-action)] hover:bg-[var(--color-action-tint)]',
          ].join(' ')}
        >
          <CalendarDays className="size-4 shrink-0" aria-hidden />
          <span>More dates</span>
        </button>
      ) : null}
    </div>
  )
}
