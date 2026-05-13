'use client'

import { Button } from '@/components/ui/button'

export type DateStripItem = {
  date: string
  weekday: string
  day: number
  available: boolean
}

export type DateStripProps = {
  dates: DateStripItem[]
  selectedDate: string | null
  onSelect: (date: string) => void
  className?: string
}

export function DateStrip({
  dates,
  selectedDate,
  onSelect,
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
            className="flex-col h-auto shrink-0 w-14 px-3 py-2"
          >
            <span className="text-xs uppercase tracking-wide">{d.weekday}</span>
            <span className="text-lg font-semibold">{d.day}</span>
          </Button>
        )
      })}
    </div>
  )
}
