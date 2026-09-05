'use client'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'

export interface LaneBlockingFormValues {
  startTime: string
  endTime: string
  /** Comma-separated lane numbers, or empty string for "all lanes". */
  lanes: string
  reason: string
}

export interface LaneBlockingFormProps {
  values: LaneBlockingFormValues
  onChange: (next: LaneBlockingFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
}

export function LaneBlockingForm({
  values,
  onChange,
  onSubmit,
  submitting,
  error,
}: LaneBlockingFormProps) {
  function patch(update: Partial<LaneBlockingFormValues>) {
    onChange({ ...values, ...update })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset"
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <Input
          type="datetime-local"
          label="Start"
          value={values.startTime}
          onChange={(startTime) => patch({ startTime })}
          isRequired
        />
        <Input
          type="datetime-local"
          label="End"
          value={values.endTime}
          onChange={(endTime) => patch({ endTime })}
          isRequired
        />
      </div>
      <Input
        label="Lanes (numbers, comma-separated — leave blank for all)"
        value={values.lanes}
        onChange={(lanes) => patch({ lanes })}
        placeholder="3, 4, 5"
      />
      <Input
        label="Reason"
        value={values.reason}
        onChange={(reason) => patch({ reason })}
        placeholder="Lane maintenance, league night, etc."
      />
      {error ? <p className="text-sm text-error-primary">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" color="primary" isLoading={submitting}>
          Block lanes
        </Button>
      </div>
    </form>
  )
}
