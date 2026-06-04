'use client'

import { useTenant } from '@/app/(customer)/book/tenant-provider'
import {
  getLaneAssignmentSummary,
  getLaneCount,
} from '@/lib/lane-logic'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type LaneAllocationViewProps = {
  bowlerCount: number
  className?: string
}

export function LaneAllocationView({
  bowlerCount,
  className,
}: LaneAllocationViewProps) {
  const { bowlersPerLane } = useTenant()
  const laneCount = getLaneCount(bowlerCount, bowlersPerLane)
  const summary = getLaneAssignmentSummary(bowlerCount, bowlersPerLane)

  return (
    <div
      className={cn('flex flex-col items-center gap-3', className)}
    >
      {laneCount > 0 ? (
        <div
          className="flex items-end gap-2"
          role="img"
          aria-label={summary}
        >
          {Array.from({ length: laneCount }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className="flex h-16 w-10 items-end justify-center rounded-md bg-[var(--color-action)] pb-1 text-xs font-semibold text-[var(--color-text-on-action)]"
            >
              <span>{i + 1}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="text-sm text-[var(--color-text-secondary)]">{summary}</p>
    </div>
  )
}
