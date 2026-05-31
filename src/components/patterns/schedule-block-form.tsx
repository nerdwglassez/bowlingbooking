'use client'

// ScheduleBlockForm — controlled block creation form (wireframe sheet fields).

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      className="flex flex-col gap-3"
    >
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          What to block
        </legend>
        <div className="flex rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-sunken)] p-0.5">
          {(['venue', 'lanes'] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              className={`flex-1 rounded-[calc(var(--radius-md)-2px)] py-2 text-xs font-semibold transition-colors ${
                values.scope === scope
                  ? 'border border-solid border-[color-mix(in_srgb,var(--status-error-border)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_12%,transparent)] text-[var(--status-error-text)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
              onClick={() => patch({ scope })}
            >
              {scope === 'venue' ? 'Whole venue' : 'Specific lanes'}
            </button>
          ))}
        </div>
      </fieldset>

      {values.scope === 'lanes' ? (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Lanes
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {laneNumbers.map((lane) => {
              const on = values.lanes.includes(lane)
              return (
                <button
                  key={lane}
                  type="button"
                  className={`min-w-8 rounded-[var(--radius-full)] border px-2.5 py-1 text-[11px] font-semibold ${
                    on
                      ? 'border-[color-mix(in_srgb,var(--status-error-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_10%,transparent)] text-[var(--status-error-text)]'
                      : 'border-[var(--color-border-strong)] bg-[var(--surface-sunken)] text-[var(--color-text-secondary)]'
                  }`}
                  onClick={() => toggleLane(lane)}
                >
                  {lane}
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Reason
        </span>
        <Input
          value={values.reason}
          onChange={(e) => patch({ reason: e.target.value })}
          placeholder="League night setup"
          required
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Date
        </span>
        <Input
          type="date"
          value={values.date}
          onChange={(e) => patch({ date: e.target.value })}
          required
        />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Time
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.allDay}
            onChange={(e) => patch({ allDay: e.target.checked })}
          />
          <span className="text-[var(--color-text-primary)]">All day</span>
        </label>
        {!values.allDay ? (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="time"
              value={values.startTime}
              onChange={(e) => patch({ startTime: e.target.value })}
              required
            />
            <Input
              type="time"
              value={values.endTime}
              onChange={(e) => patch({ endTime: e.target.value })}
              required
            />
          </div>
        ) : (
          <p className="text-[10px] text-[var(--color-text-secondary)]">
            Leave times blank to block the entire day.
          </p>
        )}
      </fieldset>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="submit"
          variant="secondary"
          fullWidth
          loading={submitting}
          className="flex-[2] border-[color-mix(in_srgb,var(--status-error-border)_30%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_15%,transparent)] text-[var(--status-error-text)]"
        >
          Add block
        </Button>
        <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
