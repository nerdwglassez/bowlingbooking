'use client'

// LaneBlockingForm — controlled form for creating a BlockedSlot. All field
// state lives on the parent page; this pattern just renders inputs and
// reports user intent via callbacks. No useState — that's the "controlled
// pattern" rule (drift sentinel enforces it).

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Start</span>
          <Input
            type="datetime-local"
            value={values.startTime}
            onChange={(e) => patch({ startTime: e.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">End</span>
          <Input
            type="datetime-local"
            value={values.endTime}
            onChange={(e) => patch({ endTime: e.target.value })}
            required
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">
          Lanes (numbers, comma-separated — leave blank for all)
        </span>
        <Input
          type="text"
          value={values.lanes}
          onChange={(e) => patch({ lanes: e.target.value })}
          placeholder="3, 4, 5"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Reason</span>
        <Input
          type="text"
          value={values.reason}
          onChange={(e) => patch({ reason: e.target.value })}
          placeholder="Lane maintenance, league night, etc."
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Block lanes
        </Button>
      </div>
    </form>
  )
}
