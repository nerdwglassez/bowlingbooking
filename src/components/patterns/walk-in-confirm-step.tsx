'use client'

// WalkInConfirmStep — step 3: summary + payment + create.

import type { WalkInPaymentMethod } from '@/lib/actions/staff'
import {
  formatBowlersSummary,
  formatLaneSummary,
  formatWalkInSource,
  formatWalkInStartedAt,
  type WalkInBookingSource,
} from '@/lib/walk-in-display'

export type WalkInConfirmStepValues = {
  source: WalkInBookingSource
  customerName: string
  bowlerCount: number
  packageName: string
  laneNumbers: number[]
  startedAt: Date
  paymentMethod: WalkInPaymentMethod
}

export type WalkInConfirmStepProps = {
  values: WalkInConfirmStepValues
  onChangePayment: (method: WalkInPaymentMethod) => void
  onBack: () => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
}

const PAYMENT_OPTIONS: { value: WalkInPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card_at_counter', label: 'Card terminal' },
  { value: 'pending', label: 'Tab / invoice' },
]

export function WalkInConfirmStep({
  values,
  onChangePayment,
  onBack,
  onSubmit,
  submitting,
  error,
}: WalkInConfirmStepProps) {
  const rows: { label: string; value: string; accent?: boolean }[] = [
    { label: 'Guest', value: values.customerName },
    { label: 'Bowlers', value: formatBowlersSummary(values.bowlerCount) },
    {
      label: 'Package',
      value: values.packageName || 'No package',
    },
    { label: 'Lane', value: formatLaneSummary(values.laneNumbers) },
    { label: 'Source', value: formatWalkInSource(values.source) },
    {
      label: 'Started',
      value: formatWalkInStartedAt(values.startedAt),
      accent: true,
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-raised)] p-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-solid border-[var(--color-border)] py-1.5 last:border-b-0"
          >
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {row.label}
            </span>
            <span
              className={`text-xs font-medium ${
                row.accent
                  ? 'text-[var(--color-action-dark)]'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div>
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Payment collected at desk
        </span>
        <div className="flex gap-1.5">
          {PAYMENT_OPTIONS.map((opt) => {
            const active = values.paymentMethod === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                className={`flex-1 rounded-[var(--radius-md)] border-[1.5px] border-solid px-1.5 py-2 text-center text-[11px] font-semibold ${
                  active
                    ? 'border-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action-subtle)_10%,transparent)] text-[var(--color-action-dark)]'
                    : 'border-[var(--color-border-strong)] bg-[var(--surface-raised)] text-[var(--color-text-secondary)]'
                }`}
                onClick={() => onChangePayment(opt.value)}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[10px] text-[var(--color-text-secondary)]">
          Payment is handled at the desk — no online charge. This booking is
          created as checked-in immediately.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-raised)] px-3 py-3 text-[13px] text-[var(--color-text-secondary)]"
          onClick={onBack}
          disabled={submitting}
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={submitting}
          className="flex-[2] rounded-[var(--radius-md)] bg-[var(--color-action)] px-3 py-3 text-[13px] font-semibold text-[var(--color-text-on-action)] disabled:cursor-not-allowed disabled:opacity-35"
          onClick={onSubmit}
        >
          {submitting ? 'Creating…' : 'Create & check in'}
        </button>
      </div>
    </div>
  )
}
