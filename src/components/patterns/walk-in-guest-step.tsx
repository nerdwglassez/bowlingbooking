'use client'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import {
  formatBowlerLaneHint,
  type WalkInBookingSource,
} from '@/lib/walk-in-display'

export type WalkInGuestStepValues = {
  source: WalkInBookingSource
  customerName: string
  customerEmail: string
  bowlerCount: number
  scheduledStart: string
}

export type WalkInGuestStepProps = {
  values: WalkInGuestStepValues
  onChange: (next: WalkInGuestStepValues) => void
  onNext: () => void
}

const SOURCES: { value: WalkInBookingSource; label: string }[] = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
  { value: 'advance', label: 'Advance' },
]

export function WalkInGuestStep({
  values,
  onChange,
  onNext,
}: WalkInGuestStepProps) {
  function patch(update: Partial<WalkInGuestStepValues>) {
    onChange({ ...values, ...update })
  }

  const showSchedule = values.source !== 'walk_in'
  const canNext = values.customerName.trim().length > 0 && values.bowlerCount >= 1

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-secondary">Source</span>
        <div className="flex gap-2">
          {SOURCES.map((opt) => {
            const active = values.source === opt.value
            return (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                color={active ? 'secondary' : 'tertiary'}
                className="flex-1"
                onClick={() => patch({ source: opt.value })}
              >
                {opt.label}
              </Button>
            )
          })}
        </div>
      </div>

      <Input
        label="Guest name"
        value={values.customerName}
        onChange={(customerName) => patch({ customerName })}
        placeholder="First name or group name"
        isRequired
      />

      <Input
        type="email"
        label="Email"
        hint="Optional — leave blank for guests without accounts."
        value={values.customerEmail}
        onChange={(customerEmail) => patch({ customerEmail })}
        placeholder="For confirmation email"
      />

      {showSchedule ? (
        <Input
          type="datetime-local"
          label="Start time"
          value={values.scheduledStart}
          onChange={(scheduledStart) => patch({ scheduledStart })}
        />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-secondary">Bowler count</span>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            color="secondary"
            size="sm"
            aria-label="Decrease bowlers"
            onClick={() =>
              patch({ bowlerCount: Math.max(1, values.bowlerCount - 1) })
            }
          >
            −
          </Button>
          <span className="min-w-9 text-center text-display-xs font-semibold text-primary">
            {values.bowlerCount}
          </span>
          <Button
            type="button"
            color="secondary"
            size="sm"
            aria-label="Increase bowlers"
            onClick={() => patch({ bowlerCount: values.bowlerCount + 1 })}
          >
            +
          </Button>
          <span className="text-sm text-tertiary">
            {formatBowlerLaneHint(values.bowlerCount)}
          </span>
        </div>
      </div>

      <Button
        type="button"
        color="primary"
        size="md"
        isDisabled={!canNext}
        onClick={onNext}
      >
        Next — Package & lane
      </Button>
    </div>
  )
}
