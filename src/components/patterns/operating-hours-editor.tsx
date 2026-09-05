'use client'

import { SettingsSaveButton } from '@/components/patterns/settings-save-button'
import { SettingsFieldRow } from '@/components/patterns/settings-field-row'
import { Checkbox } from '@/components/base/checkbox/checkbox'
import { NativeSelect } from '@/components/base/select/select-native'
import type { SettingsSavePhase } from '@/lib/use-settings-form-state'

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
  saveDirty?: boolean
  savePhase?: SettingsSavePhase
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

const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 1.5, label: '1.5 hours' },
  { value: 2, label: '2 hours' },
  { value: 3, label: '3 hours' },
  { value: 4, label: '4 hours' },
]

const TIME_FORMAT = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function buildTimeOptions(stepMinutes = 30): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    options.push({
      label: TIME_FORMAT.format(new Date(2000, 0, 1, hours, mins)),
      value,
    })
  }
  return options
}

const TIME_OPTIONS = buildTimeOptions(30)

function timeSelectOptions(current: string): { label: string; value: string }[] {
  if (TIME_OPTIONS.some((opt) => opt.value === current)) return TIME_OPTIONS
  const [h, m] = current.split(':').map(Number)
  const hours = Number.isFinite(h) ? h : 0
  const mins = Number.isFinite(m) ? m : 0
  return [
    ...TIME_OPTIONS,
    {
      label: TIME_FORMAT.format(new Date(2000, 0, 1, hours, mins)),
      value: current,
    },
  ].sort((a, b) => a.value.localeCompare(b.value))
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
        className="flex size-7 items-center justify-center rounded-lg border border-solid border-secondary bg-secondary text-base leading-none text-primary disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="min-w-6 text-center [font-family:var(--font-display)] text-[17px] text-primary">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-7 items-center justify-center rounded-lg border border-solid border-secondary bg-secondary text-base leading-none text-primary disabled:opacity-30"
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
  saveDirty = true,
  savePhase = 'idle',
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
      className="flex flex-col"
    >
      <SettingsFieldRow
        label="Weekly schedule"
        hint="Unchecked days are closed. Times are stored as 24-hour HH:MM."
      >
        <ul className="flex flex-col gap-3">
          {sorted.map((row) => {
            const isOpen = !row.closed
            const dayLabel = DAY_LABELS[row.dayOfWeek] ?? `Day ${row.dayOfWeek}`
            return (
              <li
                key={row.dayOfWeek}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <Checkbox
                  isSelected={isOpen}
                  isDisabled={readOnly}
                  onChange={(open) =>
                    patchRow(row.dayOfWeek, { closed: !open })
                  }
                  label={dayLabel}
                />
                <div className="flex min-w-0 flex-1 items-end gap-2 sm:justify-end">
                  <NativeSelect
                    label="From"
                    size="sm"
                    className="min-w-[8.5rem]"
                    value={row.openTime}
                    disabled={readOnly || row.closed}
                    onChange={(e) =>
                      patchRow(row.dayOfWeek, { openTime: e.target.value })
                    }
                    options={timeSelectOptions(row.openTime)}
                  />
                  <NativeSelect
                    label="To"
                    size="sm"
                    className="min-w-[8.5rem]"
                    value={row.closeTime}
                    disabled={readOnly || row.closed}
                    onChange={(e) =>
                      patchRow(row.dayOfWeek, { closeTime: e.target.value })
                    }
                    options={timeSelectOptions(row.closeTime)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
        {!readOnly ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-tertiary">
              Apply Monday hours to Tuesday–Thursday
            </p>
            <button
              type="button"
              onClick={applyWeekdayHours}
              className="text-sm font-semibold text-brand-secondary"
            >
              Apply
            </button>
          </div>
        ) : null}
      </SettingsFieldRow>

      {laneConfig ? (
        <>
          <SettingsFieldRow
            label="Total lanes"
            hint="Physical lanes available for assignment."
          >
            <Stepper
              value={laneConfig.totalLanes}
              min={1}
              max={48}
              disabled={readOnly || !onLaneConfigChange}
              onChange={(totalLanes) =>
                onLaneConfigChange?.({ ...laneConfig, totalLanes })
              }
            />
          </SettingsFieldRow>
          <SettingsFieldRow
            label="Max bowlers per lane"
            hint="Drives lane assignment via getLaneCount."
          >
            <Stepper
              value={laneConfig.maxBowlersPerLane}
              min={4}
              max={8}
              disabled={readOnly || !onLaneConfigChange}
              onChange={(maxBowlersPerLane) =>
                onLaneConfigChange?.({ ...laneConfig, maxBowlersPerLane })
              }
            />
          </SettingsFieldRow>
          <SettingsFieldRow
            label="Booking duration"
            hint="Minimum and maximum session length customers can book."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NativeSelect
                label="Minimum"
                value={String(laneConfig.minDurationHours)}
                disabled={readOnly || !onLaneConfigChange}
                onChange={(e) =>
                  onLaneConfigChange?.({
                    ...laneConfig,
                    minDurationHours: Number(e.target.value),
                  })
                }
                options={DURATION_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: String(opt.value),
                }))}
              />
              <NativeSelect
                label="Maximum"
                value={String(laneConfig.maxDurationHours)}
                disabled={readOnly || !onLaneConfigChange}
                onChange={(e) =>
                  onLaneConfigChange?.({
                    ...laneConfig,
                    maxDurationHours: Number(e.target.value),
                  })
                }
                options={DURATION_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: String(opt.value),
                }))}
              />
            </div>
          </SettingsFieldRow>
        </>
      ) : null}

      {error ? (
        <p className="pt-4 text-sm text-error-primary">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="pt-4 text-sm text-success-primary">{successMessage}</p>
      ) : null}

      {!readOnly ? (
        <div className="flex justify-end pt-4">
          <SettingsSaveButton
            label="Save operating hours"
            dirty={saveDirty}
            phase={savePhase ?? (submitting ? 'saving' : 'idle')}
          />
        </div>
      ) : null}
    </form>
  )
}
