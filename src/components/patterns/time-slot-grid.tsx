'use client'

import { Button } from '@/components/ui/button'

import type { TimeSlot } from '@/types'

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function formatSlotTime(d: Date): string {
  return TIME_FORMATTER.format(d).toLowerCase().replace(' ', '')
}

export type TimeSlotGridProps = {
  slots: TimeSlot[]
  selectedSlotId: string | null
  onSelect: (slot: TimeSlot) => void
  className?: string
}

export function TimeSlotGrid({
  slots,
  selectedSlotId,
  onSelect,
  className,
}: TimeSlotGridProps) {
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
      {slots.map((slot) => (
        <Button
          key={slot.id}
          type="button"
          variant={selectedSlotId === slot.id ? 'primary' : 'secondary'}
          size="md"
          role="radio"
          aria-checked={selectedSlotId === slot.id}
          disabled={!slot.available}
          onClick={() => onSelect(slot)}
          className="w-full"
        >
          {formatSlotTime(slot.startTime)}
        </Button>
      ))}
    </div>
  )
}
