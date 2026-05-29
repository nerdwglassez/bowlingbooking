'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTimeSlotAvailabilityCaption } from '@/lib/booking-display'

import type { TimeSlot } from '@/types'

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function formatSlotTime(d: Date): string {
  return TIME_FORMATTER.format(d).toLowerCase().replace(' ', '')
}

function captionClassName(slot: TimeSlot, selectedSlotId: string | null): string {
  if (!slot.available) {
    return 'text-[var(--color-text-muted)]'
  }
  if (slot.id === selectedSlotId) {
    return 'text-[var(--color-text-on-action)] opacity-90'
  }
  return 'text-[var(--color-text-secondary)]'
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
        className={[
          'grid grid-cols-3 sm:grid-cols-4 gap-2',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-busy
        aria-label="Loading available times"
      >
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="min-h-[4.25rem] w-full" />
        ))}
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose a time"
      className={[
        'grid grid-cols-3 sm:grid-cols-4 gap-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {slots.map((slot) => {
        const caption = formatTimeSlotAvailabilityCaption(slot, selectedSlotId)
        const timeLabel = formatSlotTime(slot.startTime)
        const selected = selectedSlotId === slot.id
        const variant = !slot.available
          ? 'ghost'
          : selected
            ? 'primary'
            : 'secondary'

        return (
          <Button
            key={slot.id}
            type="button"
            variant={variant}
            size="md"
            role="radio"
            aria-checked={selected}
            aria-label={`${timeLabel}, ${caption}`}
            disabled={!slot.available}
            onClick={() => onSelect(slot)}
            className="!h-auto min-h-[4.25rem] w-full flex-col gap-0.5 py-2 text-center"
          >
            <span className="text-sm font-medium leading-tight">
              {timeLabel}
            </span>
            <span
              className={[
                'text-[11px] font-medium leading-tight',
                captionClassName(slot, selectedSlotId),
              ].join(' ')}
            >
              {caption}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
