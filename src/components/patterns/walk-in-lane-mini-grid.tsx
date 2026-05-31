'use client'

// WalkInLaneMiniGrid — compact lane picker for walk-in override.

import type { CockpitLaneCard } from '@/lib/actions/staff'
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
  available:
    'border-[color-mix(in_srgb,var(--status-ok-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--status-ok-bg)_8%,transparent)] text-[var(--status-ok-text)]',
  occupied:
    'cursor-not-allowed border-[color-mix(in_srgb,var(--status-error-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_8%,transparent)] text-[var(--status-error-text)] opacity-50',
  blocked:
    'cursor-not-allowed border-[var(--color-border-strong)] bg-[var(--surface-sunken)] text-[var(--color-text-secondary)] opacity-40',
  selected:
    'border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action-subtle)_15%,transparent)] text-[var(--color-action-dark)]',
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
      <p className="mb-1.5 text-[10px] text-[var(--color-text-secondary)]">
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
              className={`flex aspect-square items-center justify-center rounded-[var(--radius-sm)] border-[1.5px] border-solid text-[11px] font-semibold ${STATE_CLASS[state]}`}
              onClick={() => toggleLane(lane.number, state)}
            >
              {lane.number}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        <LegendDot className="border-[color-mix(in_srgb,var(--status-ok-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--status-ok-bg)_8%,transparent)]" label="Available" />
        <LegendDot className="border-[color-mix(in_srgb,var(--status-error-border)_60%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_8%,transparent)]" label="Occupied" />
        <LegendDot className="border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action-subtle)_15%,transparent)]" label="Selected" />
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
        className={`size-2 shrink-0 rounded-[2px] border border-solid ${className}`}
        aria-hidden
      />
      <span className="text-[9px] text-[var(--color-text-secondary)]">
        {label}
      </span>
    </div>
  )
}
