'use client'

import { Button } from '@/components/base/buttons/button'
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
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 border-b border-secondary py-2 last:border-b-0"
          >
            <span className="text-sm text-tertiary">{row.label}</span>
            <span
              className={
                row.accent
                  ? 'text-sm font-medium text-brand-secondary'
                  : 'text-sm font-medium text-primary'
              }
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-secondary">
          Payment collected at desk
        </span>
        <div className="flex gap-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const active = values.paymentMethod === opt.value
            return (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                color={active ? 'secondary' : 'tertiary'}
                className="flex-1"
                onClick={() => onChangePayment(opt.value)}
              >
                {opt.label}
              </Button>
            )
          })}
        </div>
        <p className="text-sm text-tertiary">
          Payment is handled at the desk — no online charge. This booking is
          created as checked-in immediately.
        </p>
      </div>

      {error ? <p className="text-sm text-error-primary">{error}</p> : null}

      <div className="flex gap-2">
        <Button
          type="button"
          color="secondary"
          size="md"
          className="flex-1"
          onClick={onBack}
          isDisabled={submitting}
        >
          Back
        </Button>
        <Button
          type="button"
          color="primary"
          size="md"
          className="flex-[2]"
          isLoading={submitting}
          onClick={onSubmit}
        >
          Create & check in
        </Button>
      </div>
    </div>
  )
}
