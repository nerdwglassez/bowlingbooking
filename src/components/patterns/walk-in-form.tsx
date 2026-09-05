'use client'

// WalkInForm — controlled form for /staff/walkin.
//
// All state lives on the parent page. The pattern renders the inputs and
// reports user intent via callbacks. Includes a payment-method toggle
// (cash / card_at_counter / pending) because walk-ins don't go through
// Stripe — the Payment row's `status` is set directly from the staff's
// choice.

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { formatPrice } from '@/lib/pricing'
import type { Package } from '@/types'

export type WalkInPaymentMethod = 'cash' | 'card_at_counter' | 'pending'

export interface WalkInFormValues {
  customerName: string
  customerEmail: string
  customerPhone: string
  bowlerCount: number
  packageId: string
  /** ISO datetime-local string. */
  startTime: string
  /** Minutes the booking should last. */
  durationMinutes: number
  paymentMethod: WalkInPaymentMethod
  notes: string
}

export interface WalkInFormProps {
  values: WalkInFormValues
  packages: Package[]
  totalAmount: number
  onChange: (next: WalkInFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
}

const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
]

const PAYMENT_LABEL: Record<WalkInPaymentMethod, string> = {
  cash: 'Cash',
  card_at_counter: 'Card at counter',
  pending: 'Pay later (pending)',
}

export function WalkInForm({
  values,
  packages,
  totalAmount,
  onChange,
  onSubmit,
  submitting,
  error,
}: WalkInFormProps) {
  function patch(update: Partial<WalkInFormValues>) {
    onChange({ ...values, ...update })
  }

  const paymentMethods: WalkInPaymentMethod[] = [
    'cash',
    'card_at_counter',
    'pending',
  ]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Customer
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Name</span>
            <Input
              type="text"
              value={values.customerName}
              onChange={(customerName) => patch({ customerName })}
              isRequired
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Phone</span>
            <Input
              type="tel"
              value={values.customerPhone}
              onChange={(customerPhone) => patch({ customerPhone })}
              placeholder="(555) 555-1234"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">
            Email (optional)
          </span>
          <Input
            type="email"
            value={values.customerEmail}
            onChange={(customerEmail) => patch({ customerEmail })}
            placeholder="optional@example.com"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Booking
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Bowlers</span>
            <Input
              type="number"
              value={String(values.bowlerCount)}
              onChange={(value) =>
                patch({ bowlerCount: Number(value) || 1 })
              }
              isRequired
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-tertiary">Duration</span>
            <NativeSelect
              value={String(values.durationMinutes)}
              onChange={(e) =>
                patch({ durationMinutes: Number(e.target.value) })
              }
              options={DURATION_OPTIONS.map((opt) => ({
                label: opt.label,
                value: String(opt.value),
              }))}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Start</span>
          <Input
            type="datetime-local"
            value={values.startTime}
            onChange={(startTime) => patch({ startTime })}
            isRequired
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">Package</span>
          <NativeSelect
            value={values.packageId}
            onChange={(e) => patch({ packageId: e.target.value })}
            required
            options={[
              { label: 'Select a package…', value: '' },
              ...packages.map((p) => ({
                label: `${p.name} — ${formatPrice(p.basePrice)}`,
                value: p.id,
              })),
            ]}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-tertiary">
            Notes (optional)
          </span>
          <Input
            type="text"
            value={values.notes}
            onChange={(notes) => patch({ notes })}
            placeholder="Birthday for Riley, allergic to peanuts, etc."
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-solid border-secondary bg-primary p-4">
        <h2 className="text-xs uppercase tracking-wide text-tertiary">
          Payment
        </h2>
        <div
          role="radiogroup"
          aria-label="Payment method"
          className="grid gap-2 md:grid-cols-3"
        >
          {paymentMethods.map((method) => {
            const active = values.paymentMethod === method
            return (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patch({ paymentMethod: method })}
                data-active={active ? '' : undefined}
                className="rounded-xl border border-solid border-secondary bg-secondary p-3 text-sm text-tertiary transition-colors hover:border-secondary data-[active]:border-brand data-[active]:bg-brand-solid data-[active]:text-white"
              >
                {PAYMENT_LABEL[method]}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-tertiary">
          Total: <strong className="text-primary">{formatPrice(totalAmount)}</strong>
        </p>
      </section>

      {error ? (
        <p className="text-sm text-error-primary">{error}</p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
        Create walk-in booking
      </Button>
    </form>
  )
}
