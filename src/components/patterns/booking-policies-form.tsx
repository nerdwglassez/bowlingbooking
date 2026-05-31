'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { getThemePreset, THEME_PRESETS } from '@/lib/themes'

export interface BookingPoliciesFormValues {
  holdTimeoutMins: number
  maxOnlineBowlers: number
  cancellationWindowHours: number
  cancellationRefundPercent: number
  timezone: string
  themeSlug: string
}

export interface BookingPoliciesFormProps {
  values: BookingPoliciesFormValues
  onChange: (next: BookingPoliciesFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  readOnly?: boolean
  error?: string | null
  successMessage?: string | null
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]

const CANCELLATION_WINDOWS = [
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
]

function PolicyRow({
  label,
  sub,
  note,
  children,
}: {
  label: string
  sub?: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
          {sub ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
              {sub}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
      {note ? (
        <p className="text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
          {note}
        </p>
      ) : null}
    </div>
  )
}

export function BookingPoliciesForm({
  values,
  onChange,
  onSubmit,
  submitting,
  readOnly,
  error,
  successMessage,
}: BookingPoliciesFormProps) {
  function patch(update: Partial<BookingPoliciesFormValues>) {
    onChange({ ...values, ...update })
  }

  const selectedPreset = getThemePreset(values.themeSlug)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!readOnly) onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <SettingsGroupLabel>Checkout</SettingsGroupLabel>
      <PolicyRow
        label="Lane hold time"
        sub="Minutes a slot stays reserved during checkout"
      >
        <Input
          type="number"
          min={1}
          max={60}
          className="w-16 text-center"
          inputSize="sm"
          value={values.holdTimeoutMins}
          onChange={(e) =>
            patch({ holdTimeoutMins: Number(e.target.value) || 1 })
          }
          disabled={readOnly}
        />
      </PolicyRow>

      <SettingsGroupLabel>Self-serve changes</SettingsGroupLabel>
      <PolicyRow
        label="Cancellation window"
        sub="How far ahead customers can cancel for a refund"
        note="Shown to customers as 'Free cancellation until [date]'"
      >
        <Select
          value={String(values.cancellationWindowHours)}
          onChange={(e) =>
            patch({ cancellationWindowHours: Number(e.target.value) })
          }
          disabled={readOnly}
          className="min-w-[7rem]"
        >
          {CANCELLATION_WINDOWS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </PolicyRow>
      <PolicyRow
        label="Refund percent within window"
        sub="Percentage refunded when cancelling on time"
      >
        <Input
          type="number"
          min={0}
          max={100}
          className="w-16 text-center"
          inputSize="sm"
          value={values.cancellationRefundPercent}
          onChange={(e) =>
            patch({
              cancellationRefundPercent: Math.max(
                0,
                Math.min(100, Math.floor(Number(e.target.value) || 0)),
              ),
            })
          }
          disabled={readOnly}
        />
      </PolicyRow>

      <SettingsGroupLabel>Group limits</SettingsGroupLabel>
      <PolicyRow
        label="Max bowlers online"
        sub="Largest group size customers can book online"
        note="Groups larger than this are prompted to call"
      >
        <Input
          type="number"
          min={1}
          max={36}
          className="w-16 text-center"
          inputSize="sm"
          value={values.maxOnlineBowlers}
          onChange={(e) =>
            patch({ maxOnlineBowlers: Number(e.target.value) || 1 })
          }
          disabled={readOnly}
        />
      </PolicyRow>

      <SettingsGroupLabel>Operations</SettingsGroupLabel>
      <PolicyRow label="Timezone" sub="Used for schedule and booking times">
        <Select
          value={values.timezone}
          onChange={(e) => patch({ timezone: e.target.value })}
          disabled={readOnly}
          className="min-w-[10rem]"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </PolicyRow>
      <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3.5 py-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--color-text-primary)]">
            Theme preset
          </span>
          <Select
            value={values.themeSlug}
            onChange={(e) => patch({ themeSlug: e.target.value })}
            disabled={readOnly}
          >
            {THEME_PRESETS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex items-start gap-3 text-sm">
          <span
            className="mt-0.5 shrink-0 rounded-[var(--radius-sm)] border border-solid border-[var(--color-border)]"
            style={{
              width: '1rem',
              height: '1rem',
              backgroundColor: selectedPreset.swatchHex,
            }}
            aria-hidden
          />
          {selectedPreset.description ? (
            <span className="text-xs text-[var(--color-text-secondary)]">
              {selectedPreset.description}
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--status-ok-text)]">{successMessage}</p>
      ) : null}

      {!readOnly ? (
        <Button type="submit" fullWidth loading={submitting}>
          Save policies
        </Button>
      ) : null}
    </form>
  )
}

function SettingsGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
      {children}
    </h2>
  )
}
