'use client'

// OperatingHoursEditor — controlled grid for the 7-day weekly schedule.
// All state lives on the parent page; this pattern reports each row change
// via onChange.

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export interface OperatingHourRow {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  openTime: string // "HH:MM"
  closeTime: string // "HH:MM"
  closed: boolean
}

export interface OperatingHoursEditorProps {
  values: OperatingHourRow[]
  onChange: (next: OperatingHourRow[]) => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
  successMessage?: string | null
}

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function OperatingHoursEditor({
  values,
  onChange,
  onSubmit,
  submitting,
  error,
  successMessage,
}: OperatingHoursEditorProps) {
  function patchRow(dayOfWeek: number, update: Partial<OperatingHourRow>) {
    onChange(
      values.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, ...update } : row,
      ),
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4"
    >
      <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        Operating hours
      </h2>
      <ul className="flex flex-col gap-2">
        {values
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((row) => (
            <li
              key={row.dayOfWeek}
              className="grid grid-cols-2 items-center gap-2 md:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)]"
            >
              <span className="text-sm text-[var(--color-text-primary)]">
                {DAY_LABELS[row.dayOfWeek]}
              </span>
              <Input
                type="time"
                value={row.openTime}
                onChange={(e) =>
                  patchRow(row.dayOfWeek, { openTime: e.target.value })
                }
                disabled={row.closed}
                aria-label={`${DAY_LABELS[row.dayOfWeek]} open time`}
              />
              <Input
                type="time"
                value={row.closeTime}
                onChange={(e) =>
                  patchRow(row.dayOfWeek, { closeTime: e.target.value })
                }
                disabled={row.closed}
                aria-label={`${DAY_LABELS[row.dayOfWeek]} close time`}
              />
              <Checkbox
                label="Closed"
                checked={row.closed}
                onChange={(e) =>
                  patchRow(row.dayOfWeek, { closed: e.target.checked })
                }
              />
            </li>
          ))}
      </ul>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Save hours
        </Button>
      </div>
    </form>
  )
}
