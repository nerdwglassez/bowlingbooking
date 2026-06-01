'use client'

import type { ReactNode } from 'react'

import { SettingsSaveButton } from '@/components/patterns/settings-save-button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import type { SettingsSavePhase } from '@/lib/use-settings-form-state'

export interface BookingPoliciesFormValues {
  holdTimeoutMins: number
  minBookingNoticeMinutes: number
  cancellationWindowHours: number
  rescheduleWindowHours: number
  checkInWindowMinutes: number
  cancellationRefundPercent: number
  maxOnlineBowlers: number
  maxAdvanceBookingDays: number
  lateGraceMinutes: number
  allowWalkInBookings: boolean
  requireAccountToModify: boolean
}

export interface BookingPoliciesFormProps {
  values: BookingPoliciesFormValues
  onChange: (next: BookingPoliciesFormValues) => void
  onSubmit: () => void
  readOnly?: boolean
  error?: string | null
  dirty?: boolean
  phase?: SettingsSavePhase
}

const NOTICE_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 1440, label: '24 hours' },
]

const CANCELLATION_WINDOWS = [
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
]

const CHECKIN_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
]

const ADVANCE_OPTIONS = [
  { value: 7, label: '1 week' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
]

function PolicyRow({
  label,
  sub,
  note,
  badge,
  children,
}: {
  label: string
  sub?: string
  note?: string
  badge?: 'customer' | 'ops'
  children: ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
          {sub ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {sub}
            </p>
          ) : null}
          {badge ? (
            <span
              className={`mt-1.5 inline-flex rounded-[var(--radius-full)] border border-solid px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                badge === 'customer'
                  ? 'border-[color-mix(in_srgb,var(--color-action)_20%,transparent)] text-[var(--color-action)]'
                  : 'border-[color-mix(in_srgb,var(--status-info-text)_25%,transparent)] text-[var(--status-info-text)]'
              }`}
            >
              {badge === 'customer' ? 'Shown to customers' : 'Affects cockpit Late stat'}
            </span>
          ) : null}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
      {note ? (
        <p className="mt-2 border-t border-solid border-[var(--color-border)] pt-2 text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
          {note}
        </p>
      ) : null}
    </div>
  )
}

function Stepper({
  value,
  onChange,
  min,
  max,
  unit,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  unit?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-sunken)] text-base leading-none disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-7 text-center [font-family:var(--font-display)] text-base text-[var(--color-text-primary)]">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-sunken)] text-base leading-none disabled:opacity-30"
      >
        +
      </button>
      {unit ? (
        <span className="text-[11px] text-[var(--color-text-secondary)]">{unit}</span>
      ) : null}
    </div>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
      {children}
    </h2>
  )
}

export function BookingPoliciesForm({
  values,
  onChange,
  onSubmit,
  readOnly,
  error,
  dirty,
  phase = 'idle',
}: BookingPoliciesFormProps) {
  function patch(update: Partial<BookingPoliciesFormValues>) {
    onChange({ ...values, ...update })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!readOnly) onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <GroupLabel>Checkout</GroupLabel>
      <PolicyRow label="Lane hold time" sub="Minutes a slot stays reserved during checkout">
        <Stepper
          value={values.holdTimeoutMins}
          min={1}
          max={60}
          unit="min"
          disabled={readOnly}
          onChange={(holdTimeoutMins) => patch({ holdTimeoutMins })}
        />
      </PolicyRow>
      <PolicyRow label="Minimum booking notice" sub="How soon customers can book online">
        <Select
          value={String(values.minBookingNoticeMinutes)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ minBookingNoticeMinutes: Number(e.target.value) })
          }
        >
          {NOTICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </PolicyRow>

      <GroupLabel>Self-serve changes</GroupLabel>
      <PolicyRow
        label="Cancellation window"
        sub="How far ahead customers can cancel for a refund"
        badge="customer"
        note="Shown to customers as 'Free cancellation until [date]'"
      >
        <Select
          value={String(values.cancellationWindowHours)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ cancellationWindowHours: Number(e.target.value) })
          }
        >
          {CANCELLATION_WINDOWS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </PolicyRow>
      <PolicyRow
        label="Reschedule window"
        sub="Independent window for customer reschedules"
        badge="customer"
      >
        <Select
          value={String(values.rescheduleWindowHours)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ rescheduleWindowHours: Number(e.target.value) })
          }
        >
          {CANCELLATION_WINDOWS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </PolicyRow>
      <PolicyRow
        label="Check-in window"
        sub="Customers can check in during this window before their reservation"
      >
        <Select
          value={String(values.checkInWindowMinutes)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ checkInWindowMinutes: Number(e.target.value) })
          }
        >
          {CHECKIN_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </PolicyRow>
      <PolicyRow label="Refund percent within window">
        <Input
          type="number"
          min={0}
          max={100}
          className="w-16 text-center"
          inputSize="sm"
          value={values.cancellationRefundPercent}
          disabled={readOnly}
          onChange={(e) =>
            patch({
              cancellationRefundPercent: Math.max(
                0,
                Math.min(100, Math.floor(Number(e.target.value) || 0)),
              ),
            })
          }
        />
      </PolicyRow>

      <GroupLabel>Group limits</GroupLabel>
      <PolicyRow
        label="Max bowlers online"
        sub="Largest group size customers can book online"
        note="Groups larger than this are prompted to call"
      >
        <Stepper
          value={values.maxOnlineBowlers}
          min={1}
          max={36}
          disabled={readOnly}
          onChange={(maxOnlineBowlers) => patch({ maxOnlineBowlers })}
        />
      </PolicyRow>
      <PolicyRow label="Max advance booking" sub="How far ahead customers can book online">
        <Select
          value={String(values.maxAdvanceBookingDays)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ maxAdvanceBookingDays: Number(e.target.value) })
          }
        >
          {ADVANCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </PolicyRow>

      <GroupLabel>Operations</GroupLabel>
      <PolicyRow
        label="Late grace period"
        sub="Minutes after start before a booking counts as late"
        badge="ops"
      >
        <Stepper
          value={values.lateGraceMinutes}
          min={0}
          max={30}
          unit="min"
          disabled={readOnly}
          onChange={(lateGraceMinutes) => patch({ lateGraceMinutes })}
        />
      </PolicyRow>
      <PolicyRow
        label="Allow walk-in bookings"
        sub="Disabling hides the walk-in button in the cockpit"
      >
        <Toggle
          checked={values.allowWalkInBookings}
          disabled={readOnly}
          onChange={(e) => patch({ allowWalkInBookings: e.target.checked })}
          aria-label="Allow walk-in bookings"
        />
      </PolicyRow>
      <PolicyRow
        label="Require account to modify"
        sub="Customers must sign in to cancel or reschedule online"
      >
        <Toggle
          checked={values.requireAccountToModify}
          disabled={readOnly}
          onChange={(e) => patch({ requireAccountToModify: e.target.checked })}
          aria-label="Require account to modify"
        />
      </PolicyRow>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}

      {!readOnly ? (
        <SettingsSaveButton
          label="Save policies"
          dirty={dirty ?? true}
          phase={phase}
        />
      ) : null}
    </form>
  )
}
