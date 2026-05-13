'use client'

import { Button } from '@/components/ui/button'
import { formatLaneRequirementLine } from '@/lib/lane-logic'

export type BowlerCounterProps = {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  className?: string
}

export function BowlerCounter({
  value,
  onChange,
  min = 1,
  max = 18,
  className,
}: BowlerCounterProps) {
  const summary = formatLaneRequirementLine(value)
  const caption =
    value === max ? `${summary} · max ${max} online` : summary

  return (
    <div
      className={['flex flex-col items-center', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-center gap-6">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Decrease bowler count"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </Button>
        <h2 className="text-5xl">{value}</h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Increase bowler count"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </div>
      <p className="mt-1.5 text-[var(--color-text-secondary)] text-sm text-center">
        {caption}
      </p>
    </div>
  )
}
