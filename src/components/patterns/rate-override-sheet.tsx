'use client'

import { Button } from '@/components/base/buttons/button'
import { formatPriceInputValue, parsePriceInputValue } from '@/lib/pricing'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
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
        <span className="text-tertiary">Name</span>
        <Input
          value={values.name}
          onChange={(name) => patch({ name })}
          isRequired
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-tertiary">Rate ($ / person / hour)</span>
        <Input
          type="number"
          value={formatPriceInputValue(values.ratePerPersonPerHour)}
          onChange={(value) => {
            const cents = parsePriceInputValue(value)
            if (cents !== null) patch({ ratePerPersonPerHour: cents })
          }}
          isRequired
        />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-tertiary">Days</span>
        <div className="flex flex-wrap gap-2">
          {DAY_OPTIONS.map((d) => {
            const active = values.daysOfWeek.includes(d.value)
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`rounded-full border border-solid px-2.5 py-1 text-xs font-medium ${
                  active
                    ? 'border-brand bg-brand-primary_alt text-brand-secondary'
                    : 'border-secondary text-tertiary'
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
          <span className="text-tertiary">Start</span>
          <Input
            type="time"
            value={values.startTime}
            onChange={(startTime) => patch({ startTime })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">End</span>
          <Input
            type="time"
            value={values.endTime}
            onChange={(endTime) => patch({ endTime })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-tertiary">Priority</span>
        <NativeSelect
          value={String(values.priority)}
          onChange={(e) => patch({ priority: Number(e.target.value) })}
          options={[0, 1, 2, 3, 4, 5].map((p) => ({
            label: `Priority ${p}`,
            value: String(p),
          }))}
        />
      </label>
      <Button type="submit" className="w-full" isLoading={submitting}>
        {isEdit ? 'Save period' : 'Add period'}
      </Button>
      {isEdit && onDelete ? (
        <Button type="button" color="primary-destructive" className="w-full" onClick={onDelete}>
          Delete period
        </Button>
      ) : null}
    </form>
  )
}
