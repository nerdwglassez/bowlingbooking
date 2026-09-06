'use client'

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
      className={[
        'flex gap-[7px] overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dates.map((d) => {
        const selected = selectedDate === d.date
        const unavailable = !d.available
        return (
          <button
            key={d.date}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={unavailable}
            onClick={() => onSelect(d.date)}
            className={[
              'flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)]',
              'border-[1.5px] px-3 py-[9px] transition-all',
              unavailable
                ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--surface-card)] opacity-30'
                : selected
                  ? 'border-[var(--color-action)] bg-[var(--color-action)]'
                  : 'cursor-pointer border-[var(--color-border)] bg-[var(--surface-card)]',
            ].join(' ')}
          >
            <span
              className={[
                'text-[9px] font-semibold uppercase tracking-[0.05em]',
                selected
                  ? 'text-[var(--color-text-on-action)] opacity-75'
                  : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              {d.weekday}
            </span>
            <span
              className={[
                'mt-px text-[17px] leading-none',
                selected
                  ? 'text-[var(--color-text-on-action)]'
                  : 'text-[var(--color-text-primary)]',
              ].join(' ')}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {d.day}
            </span>
          </button>
        )
      })}
      {onOpenCalendar ? (
        <button
          type="button"
          onClick={onOpenCalendar}
          className={[
            'flex min-h-11 min-w-[80px] shrink-0 items-center justify-center',
            'rounded-[var(--radius-md)] border-[1.5px] border-dashed border-[var(--color-border-strong)]',
            'bg-[var(--color-action-subtle)] px-3 py-[9px]',
            'text-[11px] font-medium whitespace-nowrap text-[var(--color-action)]',
            'transition-colors hover:border-[var(--color-action)] hover:bg-[var(--color-action-tint)]',
          ].join(' ')}
        >
          More dates →
        </button>
      ) : null}
    </div>
  )
}
