'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export interface OperatingHourRow {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  openTime: string // "HH:MM"
  closeTime: string // "HH:MM"
  closed: boolean
}

export interface LaneConfigDisplay {
  totalLanes: number
  maxBowlersPerLane: number
  minDurationHours: number
  maxDurationHours: number
}

export interface OperatingHoursEditorProps {
  values: OperatingHourRow[]
  onChange: (next: OperatingHourRow[]) => void
  onSubmit: () => void
  laneConfig?: LaneConfigDisplay
  onLaneConfigChange?: (next: LaneConfigDisplay) => void
  submitting?: boolean
  readOnly?: boolean
  error?: string | null
  successMessage?: string | null
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 1.5, label: '1.5 hours' },
  { value: 2, label: '2 hours' },
  { value: 3, label: '3 hours' },
  { value: 4, label: '4 hours' },
]

function MiniToggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-not-allowed">
      <span
        className={`text-[10px] font-semibold ${
          checked
            ? 'text-[var(--color-text-secondary)]'
            : 'text-[var(--status-error-text)]'
        }`}
      >
        {label}
      </span>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={`${label} toggle`}
      />
      <span
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          checked
            ? 'bg-[var(--status-ok-text)]'
            : 'bg-[var(--color-border-strong)]'
        } peer-disabled:opacity-30`}
        aria-hidden
      >
        <span
          className={`absolute top-[2.5px] size-[13px] rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform ${
            checked ? 'translate-x-[14px] left-[2.5px]' : 'left-[2.5px]'
          }`}
        />
      </span>
    </label>
  )
}

function Stepper({
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  value: number
  onChange: (next: number) => void
  min: number
  max: number
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-sunken)] text-base leading-none text-[var(--color-text-primary)] disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="min-w-6 text-center [font-family:var(--font-display)] text-[17px] text-[var(--color-text-primary)]">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-sunken)] text-base leading-none text-[var(--color-text-primary)] disabled:opacity-30"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

export function OperatingHoursEditor({
  values,
  onChange,
  onSubmit,
  laneConfig,
  onLaneConfigChange,
  submitting,
  readOnly,
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

  function applyWeekdayHours() {
    const monday = values.find((row) => row.dayOfWeek === 1)
    if (!monday) return
    onChange(
      values.map((row) => {
        if (row.dayOfWeek >= 1 && row.dayOfWeek <= 4) {
          return {
            ...row,
            openTime: monday.openTime,
            closeTime: monday.closeTime,
            closed: monday.closed,
          }
        }
        return row
      }),
    )
  }

  const sorted = values.slice().sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!readOnly) onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-1">
        <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Weekly schedule
        </h2>
        <ul className="flex flex-col">
          {sorted.map((row) => {
            const isOpen = !row.closed
            return (
              <li
                key={row.dayOfWeek}
                className="flex items-center gap-2 border-b border-solid border-[var(--color-border)] py-2.5 last:border-b-0"
              >
                <span
                  className={`w-9 shrink-0 text-xs font-semibold ${
                    isOpen
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)] opacity-60'
                  }`}
                >
                  {DAY_LABELS[row.dayOfWeek]}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Input
                    type="time"
                    inputSize="sm"
                    className="w-[4.5rem] px-2 text-center text-xs"
                    value={row.openTime}
                    onChange={(e) =>
                      patchRow(row.dayOfWeek, { openTime: e.target.value })
                    }
                    disabled={readOnly || row.closed}
                  />
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    –
                  </span>
                  <Input
                    type="time"
                    inputSize="sm"
                    className="w-[4.5rem] px-2 text-center text-xs"
                    value={row.closeTime}
                    onChange={(e) =>
                      patchRow(row.dayOfWeek, { closeTime: e.target.value })
                    }
                    disabled={readOnly || row.closed}
                  />
                </div>
                <MiniToggle
                  checked={isOpen}
                  disabled={readOnly}
                  label={isOpen ? 'Open' : 'Closed'}
                  onChange={(open) =>
                    patchRow(row.dayOfWeek, { closed: !open })
                  }
                />
              </li>
            )
          })}
        </ul>
        {!readOnly ? (
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Apply Mon–Thu hours to all weekdays
            </p>
            <button
              type="button"
              onClick={applyWeekdayHours}
              className="text-[11px] font-semibold text-[var(--color-action)]"
            >
              Apply
            </button>
          </div>
        ) : null}
      </section>

      {laneConfig ? (
        <>
          <div className="h-px bg-[var(--color-border)]" />
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
              Lane configuration
            </h2>
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3.5 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Total lanes
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
                  Physical lanes available
                </p>
              </div>
              <Stepper
                value={laneConfig.totalLanes}
                min={1}
                max={48}
                disabled={readOnly || !onLaneConfigChange}
                onChange={(totalLanes) =>
                  onLaneConfigChange?.({ ...laneConfig, totalLanes })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3.5 py-3">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Max bowlers per lane
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
                  Drives lane assignment calculation
                </p>
              </div>
              <Stepper
                value={laneConfig.maxBowlersPerLane}
                min={4}
                max={8}
                disabled
                onChange={() => undefined}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
              Booking duration
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
                  Minimum
                </span>
                <Select
                  value={String(laneConfig.minDurationHours)}
                  disabled={readOnly || !onLaneConfigChange}
                  onChange={(e) =>
                    onLaneConfigChange?.({
                      ...laneConfig,
                      minDurationHours: Number(e.target.value),
                    })
                  }
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-secondary)]">
                  Maximum
                </span>
                <Select
                  value={String(laneConfig.maxDurationHours)}
                  disabled={readOnly || !onLaneConfigChange}
                  onChange={(e) =>
                    onLaneConfigChange?.({
                      ...laneConfig,
                      maxDurationHours: Number(e.target.value),
                    })
                  }
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </section>
        </>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      {!readOnly ? (
        <Button type="submit" fullWidth loading={submitting}>
          Save operating hours
        </Button>
      ) : null}
    </form>
  )
}
