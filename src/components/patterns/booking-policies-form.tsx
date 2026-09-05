'use client'

import type { ReactNode } from 'react'

import { SettingsSaveButton } from '@/components/patterns/settings-save-button'
import { SettingsFieldRow } from '@/components/patterns/settings-field-row'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { Toggle } from '@/components/base/toggle/toggle'
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
    <SettingsFieldRow
      label={label}
      hint={[
        sub,
        badge === 'customer'
          ? 'Shown to customers.'
          : badge === 'ops'
            ? 'Affects cockpit Late stat.'
            : undefined,
        note,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </SettingsFieldRow>
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
        className="flex size-7 items-center justify-center rounded-lg border border-solid border-secondary bg-secondary text-base leading-none disabled:opacity-30"
      >
        −
      </button>
      <span className="min-w-7 text-center [font-family:var(--font-display)] text-base text-primary">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-7 items-center justify-center rounded-lg border border-solid border-secondary bg-secondary text-base leading-none disabled:opacity-30"
      >
        +
      </button>
      {unit ? (
        <span className="text-[11px] text-tertiary">{unit}</span>
      ) : null}
    </div>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="pt-5 text-lg font-semibold text-primary first:pt-0">
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
      className="flex flex-col"
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
        <NativeSelect
          value={String(values.minBookingNoticeMinutes)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ minBookingNoticeMinutes: Number(e.target.value) })
          }
          options={NOTICE_OPTIONS.map((o) => ({
            label: o.label,
            value: String(o.value),
          }))}
        />
      </PolicyRow>

      <GroupLabel>Self-serve changes</GroupLabel>
      <PolicyRow
        label="Cancellation window"
        sub="How far ahead customers can cancel for a refund"
        badge="customer"
        note="Shown to customers as 'Free cancellation until [date]'"
      >
        <NativeSelect
          value={String(values.cancellationWindowHours)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ cancellationWindowHours: Number(e.target.value) })
          }
          options={CANCELLATION_WINDOWS.map((o) => ({
            label: o.label,
            value: String(o.value),
          }))}
        />
      </PolicyRow>
      <PolicyRow
        label="Reschedule window"
        sub="Independent window for customer reschedules"
        badge="customer"
      >
        <NativeSelect
          value={String(values.rescheduleWindowHours)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ rescheduleWindowHours: Number(e.target.value) })
          }
          options={CANCELLATION_WINDOWS.map((o) => ({
            label: o.label,
            value: String(o.value),
          }))}
        />
      </PolicyRow>
      <PolicyRow
        label="Check-in window"
        sub="Customers can check in during this window before their reservation"
      >
        <NativeSelect
          value={String(values.checkInWindowMinutes)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ checkInWindowMinutes: Number(e.target.value) })
          }
          options={CHECKIN_OPTIONS.map((o) => ({
            label: o.label,
            value: String(o.value),
          }))}
        />
      </PolicyRow>
      <PolicyRow label="Refund percent within window">
        <Input
          type="number"
          className="w-16 text-center"
          value={String(values.cancellationRefundPercent)}
          isDisabled={readOnly}
          onChange={(value) =>
            patch({
              cancellationRefundPercent: Math.max(
                0,
                Math.min(100, Math.floor(Number(value) || 0)),
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
        <NativeSelect
          value={String(values.maxAdvanceBookingDays)}
          disabled={readOnly}
          className="min-w-[7rem]"
          onChange={(e) =>
            patch({ maxAdvanceBookingDays: Number(e.target.value) })
          }
          options={ADVANCE_OPTIONS.map((o) => ({
            label: o.label,
            value: String(o.value),
          }))}
        />
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
          isSelected={values.allowWalkInBookings}
          isDisabled={readOnly}
          onChange={(allowWalkInBookings) => patch({ allowWalkInBookings })}
          aria-label="Allow walk-in bookings"
        />
      </PolicyRow>
      <PolicyRow
        label="Require account to modify"
        sub="Customers must sign in to cancel or reschedule online"
      >
        <Toggle
          isSelected={values.requireAccountToModify}
          isDisabled={readOnly}
          onChange={(requireAccountToModify) => patch({ requireAccountToModify })}
          aria-label="Require account to modify"
        />
      </PolicyRow>

      {error ? (
        <p className="text-sm text-error-primary">{error}</p>
      ) : null}

      {!readOnly ? (
        <div className="flex justify-end pt-4">
          <SettingsSaveButton
            label="Save policies"
            dirty={dirty ?? true}
            phase={phase}
          />
        </div>
      ) : null}
    </form>
  )
}
