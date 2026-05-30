'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { formatTimeSlotAvailabilityCaption } from '@/lib/booking-display'

import type { TimeSlot } from '@/types'

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function formatSlotTime(d: Date): string {
  return TIME_FORMATTER.format(d)
}

export type TimeSlotGridProps = {
  slots: TimeSlot[]
  selectedSlotId: string | null
  onSelect: (slot: TimeSlot) => void
  loading?: boolean
  className?: string
}

export function TimeSlotGrid({
  slots,
  selectedSlotId,
  onSelect,
  loading = false,
  className,
}: TimeSlotGridProps) {
  if (loading) {
    return (
      <div
        className={['grid grid-cols-3 gap-[7px]', className]
          .filter(Boolean)
          .join(' ')}
        aria-busy
        aria-label="Loading available times"
      >
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="min-h-[3.25rem] w-full rounded-[var(--radius-md)]" />
        ))}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose a time"
      className={['grid grid-cols-3 gap-[7px]', className]
        .filter(Boolean)
        .join(' ')}
    >
      {slots.map((slot) => {
        const caption = formatTimeSlotAvailabilityCaption(slot, selectedSlotId)
        const timeLabel = formatSlotTime(slot.startTime)
        const selected = selectedSlotId === slot.id
        const unavailable = !slot.available

        return (
          <button
            key={slot.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${timeLabel}, ${caption}`}
            disabled={unavailable}
            onClick={() => onSelect(slot)}
            className={[
              'rounded-[var(--radius-md)] border-[1.5px] px-1.5 py-2.5 text-center transition-all',
              unavailable
                ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--surface-card)] opacity-30'
                : selected
                  ? 'border-[var(--color-action)] bg-[var(--color-action)] shadow-[0_0_16px_rgba(245,158,11,0.25)]'
                  : 'cursor-pointer border-[var(--color-border)] bg-[var(--surface-card)]',
            ].join(' ')}
          >
            <span
              className={[
                'block text-xs font-medium leading-tight',
                selected
                  ? 'text-[var(--color-text-on-action)]'
                  : 'text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              {timeLabel}
            </span>
            <span
              className={[
                'mt-0.5 block text-[9px] leading-tight',
                selected
                  ? 'text-[var(--color-text-on-action)] opacity-70'
                  : 'text-[var(--color-text-muted)]',
              ].join(' ')}
            >
              {caption}
            </span>
          </button>
        )
      })}
    </div>
  )
}
