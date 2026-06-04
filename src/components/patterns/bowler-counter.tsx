'use client'

import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { formatLaneRequirementLine, getLaneCount } from '@/lib/lane-logic'

export type BowlerCounterProps = {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  /** Amber warning row styling (wireframe 1c — large groups). */
  warn?: boolean
  className?: string
}

export function BowlerCounter({
  value,
  onChange,
  min = 1,
  max = 18,
  warn = false,
  className,
}: BowlerCounterProps) {
  const { bowlersPerLane } = useTenant()
  const laneCount = getLaneCount(value, bowlersPerLane)
  const metaLine = warn
    ? `Large group · ${laneCount} ${laneCount === 1 ? 'lane' : 'lanes'} required`
    : formatLaneRequirementLine(value, bowlersPerLane)

  return (
    <div className={className}>
      <div
        className={[
          'flex items-center overflow-hidden rounded-[var(--radius-lg)] border-[1.5px]',
          'bg-[var(--surface-card)]',
          warn
            ? 'border-[var(--status-warning-border)]'
            : 'border-[var(--color-border)]',
        ].join(' ')}
      >
        <button
          type="button"
          className={[
            'flex size-[52px] shrink-0 items-center justify-center',
            'border-none bg-transparent text-[22px] font-light',
            'text-[var(--color-action)] transition-opacity',
            'disabled:cursor-not-allowed disabled:opacity-35',
          ].join(' ')}
          aria-label="Decrease bowler count"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <div
          className={[
            'flex-1 text-center text-[28px] text-[var(--color-text-primary)]',
            warn ? 'text-[var(--color-action-dark)]' : '',
          ].join(' ')}
          style={{ fontFamily: 'var(--font-display)' }}
          aria-live="polite"
          aria-atomic
        >
          {value}
        </div>
        <button
          type="button"
          className={[
            'flex size-[52px] shrink-0 items-center justify-center',
            'border-none bg-transparent text-[22px] font-light',
            'text-[var(--color-action)] transition-opacity',
            'disabled:cursor-not-allowed disabled:opacity-35',
          ].join(' ')}
          aria-label="Increase bowler count"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
      <p
        className={[
          'mt-[5px] text-center text-[11px]',
          warn
            ? 'text-[var(--color-action-dark)]'
            : 'text-[var(--color-text-muted)]',
        ].join(' ')}
      >
        {metaLine}
      </p>
    </div>
  )
}
