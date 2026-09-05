'use client'

import type { CockpitLaneCard } from '@/lib/actions/staff'
import { cx } from '@/lib/cx'
import {
  canSelectMiniLane,
  cockpitLaneToMiniState,
  type WalkInMiniLaneState,
} from '@/lib/walk-in-display'

export type WalkInLaneMiniGridProps = {
  lanes: CockpitLaneCard[]
  selected: number[]
  onSelect: (laneNumbers: number[]) => void
  requiredCount: number
}

const STATE_CLASS: Record<WalkInMiniLaneState, string> = {
  available: 'border-success bg-success-primary text-success-primary',
  occupied:
    'cursor-not-allowed border-error bg-error-primary text-error-primary opacity-50',
  blocked:
    'cursor-not-allowed border-secondary bg-secondary text-tertiary opacity-40',
  selected: 'border-brand bg-brand-primary text-brand-secondary',
}

export function WalkInLaneMiniGrid({
  lanes,
  selected,
  onSelect,
  requiredCount,
}: WalkInLaneMiniGridProps) {
  function toggleLane(number: number, state: WalkInMiniLaneState) {
    if (!canSelectMiniLane(state)) return

    if (selected.includes(number)) {
      onSelect(selected.filter((n) => n !== number))
      return
    }

    if (requiredCount === 1) {
      onSelect([number])
      return
    }

    if (selected.length >= requiredCount) {
      onSelect([...selected.slice(1), number])
      return
    }

    onSelect([...selected, number].sort((a, b) => a - b))
  }

  return (
    <div>
      <p className="mb-1.5 text-sm text-tertiary">
        Tap to select {requiredCount === 1 ? 'a lane' : `${requiredCount} lanes`}
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {lanes.map((lane) => {
          const state = cockpitLaneToMiniState(lane, selected)
          return (
            <button
              key={lane.number}
              type="button"
              disabled={!canSelectMiniLane(state)}
              className={cx(
                'flex aspect-square min-h-11 items-center justify-center rounded-lg border text-sm font-semibold',
                STATE_CLASS[state],
              )}
              onClick={() => toggleLane(lane.number, state)}
            >
              {lane.number}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        <LegendDot
          className="border-success bg-success-primary"
          label="Available"
        />
        <LegendDot className="border-error bg-error-primary" label="Occupied" />
        <LegendDot
          className="border-brand bg-brand-primary"
          label="Selected"
        />
      </div>
    </div>
  )
}

function LegendDot({
  className,
  label,
}: {
  className: string
  label: string
}) {
  return (
    <div className="flex items-center gap-1">
      <span
        className={cx('size-2 shrink-0 rounded-sm border', className)}
        aria-hidden
      />
      <span className="text-xs text-tertiary">{label}</span>
    </div>
  )
}
