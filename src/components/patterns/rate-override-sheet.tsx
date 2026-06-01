'use client'

import { Button } from '@/components/ui/button'
import { formatPriceInputValue, parsePriceInputValue } from '@/lib/pricing'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { AdminPricingPeriodRow } from '@/lib/actions/admin'

const DAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export type RateOverrideFormValues = {
  name: string
  ratePerPersonPerHour: number
  daysOfWeek: number[]
  startTime: string
  endTime: string
  priority: number
}

export function rateOverrideFromRow(row: AdminPricingPeriodRow): RateOverrideFormValues {
  return {
    name: row.name,
    ratePerPersonPerHour: row.ratePerPersonPerHour,
    daysOfWeek: row.daysOfWeek,
    startTime: row.startTime ?? '10:00',
    endTime: row.endTime ?? '22:00',
    priority: row.priority,
  }
}

export function RateOverrideSheetForm({
  values,
  onChange,
  onSubmit,
  onDelete,
  submitting,
  isEdit,
}: {
  values: RateOverrideFormValues
  onChange: (next: RateOverrideFormValues) => void
  onSubmit: () => void
  onDelete?: () => void
  submitting?: boolean
  isEdit?: boolean
}) {
  function patch(update: Partial<RateOverrideFormValues>) {
    onChange({ ...values, ...update })
  }

  function toggleDay(day: number) {
    const set = new Set(values.daysOfWeek)
    if (set.has(day)) set.delete(day)
    else set.add(day)
    patch({ daysOfWeek: Array.from(set).sort((a, b) => a - b) })
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Name</span>
        <Input
          value={values.name}
          onChange={(e) => patch({ name: e.target.value })}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Rate ($ / person / hour)</span>
        <Input
          type="number"
          min={0}
          step={0.5}
          value={formatPriceInputValue(values.ratePerPersonPerHour)}
          onChange={(e) => {
            const cents = parsePriceInputValue(e.target.value)
            if (cents !== null) patch({ ratePerPersonPerHour: cents })
          }}
          required
        />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-secondary)]">Days</span>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((d) => {
            const active = values.daysOfWeek.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`rounded-[var(--radius-full)] border border-solid px-2.5 py-1 text-xs font-medium ${
                  active
                    ? 'border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action)_12%,transparent)] text-[var(--color-action)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Start</span>
          <Input
            type="time"
            value={values.startTime}
            onChange={(e) => patch({ startTime: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">End</span>
          <Input
            type="time"
            value={values.endTime}
            onChange={(e) => patch({ endTime: e.target.value })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[var(--color-text-secondary)]">Priority</span>
        <Select
          value={String(values.priority)}
          onChange={(e) => patch({ priority: Number(e.target.value) })}
        >
          {[0, 1, 2, 3, 4, 5].map((p) => (
            <option key={p} value={p}>
              Priority {p}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit" fullWidth loading={submitting}>
        {isEdit ? 'Save period' : 'Add period'}
      </Button>
      {isEdit && onDelete ? (
        <Button type="button" variant="danger" fullWidth onClick={onDelete}>
          Delete period
        </Button>
      ) : null}
    </form>
  )
}
