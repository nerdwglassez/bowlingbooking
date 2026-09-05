'use client'

import { Button } from '@/components/base/buttons/button'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { Input } from '@/components/base/input/input'

export type BlockScope = 'venue' | 'lanes'

export interface ScheduleBlockFormValues {
  scope: BlockScope
  lanes: number[]
  reason: string
  date: string
  startTime: string
  endTime: string
  allDay: boolean
}

export interface ScheduleBlockFormProps {
  values: ScheduleBlockFormValues
  totalLanes: number
  onChange: (next: ScheduleBlockFormValues) => void
  onSubmit: () => void
  onCancel: () => void
  submitting?: boolean
  error?: string | null
}

export function ScheduleBlockForm({
  values,
  totalLanes,
  onChange,
  onSubmit,
  onCancel,
  submitting,
  error,
}: ScheduleBlockFormProps) {
  function patch(update: Partial<ScheduleBlockFormValues>) {
    onChange({ ...values, ...update })
  }

  function toggleLane(lane: number) {
    const next = values.lanes.includes(lane)
      ? values.lanes.filter((n) => n !== lane)
      : [...values.lanes, lane].sort((a, b) => a - b)
    patch({ lanes: next })
  }

  const laneNumbers = Array.from({ length: totalLanes }, (_, i) => i + 1)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-secondary">
          What to block
        </legend>
        <div className="flex gap-2">
          {(['venue', 'lanes'] as const).map((scope) => (
            <Button
              key={scope}
              type="button"
              size="sm"
              color={values.scope === scope ? 'secondary' : 'tertiary'}
              className="flex-1"
              onClick={() => patch({ scope })}
            >
              {scope === 'venue' ? 'Whole venue' : 'Specific lanes'}
            </Button>
          ))}
        </div>
      </fieldset>

      {values.scope === 'lanes' ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-secondary">Lanes</legend>
          <div className="flex flex-wrap gap-1.5">
            {laneNumbers.map((lane) => {
              const on = values.lanes.includes(lane)
              return (
                <Button
                  key={lane}
                  type="button"
                  size="sm"
                  color={on ? 'primary-destructive' : 'secondary'}
                  onClick={() => toggleLane(lane)}
                >
                  {lane}
                </Button>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      <Input
        label="Reason"
        value={values.reason}
        onChange={(reason) => patch({ reason })}
        placeholder="League night setup"
        isRequired
      />

      <Input
        type="date"
        label="Date"
        value={values.date}
        onChange={(date) => patch({ date })}
        isRequired
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-secondary">Time</legend>
        <Checkbox
          isSelected={values.allDay}
          onChange={(allDay) => patch({ allDay })}
          label="All day"
        />
        {!values.allDay ? (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="time"
              aria-label="Start time"
              value={values.startTime}
              onChange={(startTime) => patch({ startTime })}
              isRequired
            />
            <Input
              type="time"
              aria-label="End time"
              value={values.endTime}
              onChange={(endTime) => patch({ endTime })}
              isRequired
            />
          </div>
        ) : (
          <p className="text-sm text-tertiary">
            Leave times blank to block the entire day.
          </p>
        )}
      </fieldset>

      {error ? <p className="text-sm text-error-primary">{error}</p> : null}

      <div className="flex gap-2">
        <Button
          type="submit"
          color="primary-destructive"
          className="flex-[2]"
          isLoading={submitting}
        >
          Add block
        </Button>
        <Button type="button" color="tertiary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
