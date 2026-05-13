'use client'

// WalkInForm — controlled form for /staff/walkin.
//
// All state lives on the parent page. The pattern renders the inputs and
// reports user intent via callbacks. Includes a payment-method toggle
// (cash / card_at_counter / pending) because walk-ins don't go through
// Stripe — the Payment row's `status` is set directly from the staff's
// choice.

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Customer
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Name</span>
            <Input
              type="text"
              value={values.customerName}
              onChange={(e) => patch({ customerName: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Phone</span>
            <Input
              type="tel"
              value={values.customerPhone}
              onChange={(e) => patch({ customerPhone: e.target.value })}
              placeholder="(555) 555-1234"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            Email (optional)
          </span>
          <Input
            type="email"
            value={values.customerEmail}
            onChange={(e) => patch({ customerEmail: e.target.value })}
            placeholder="optional@example.com"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Booking
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Bowlers</span>
            <Input
              type="number"
              min={1}
              max={36}
              value={values.bowlerCount}
              onChange={(e) =>
                patch({ bowlerCount: Number(e.target.value) || 1 })
              }
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Duration</span>
            <Select
              value={String(values.durationMinutes)}
              onChange={(e) =>
                patch({ durationMinutes: Number(e.target.value) })
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
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Start</span>
          <Input
            type="datetime-local"
            value={values.startTime}
            onChange={(e) => patch({ startTime: e.target.value })}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Package</span>
          <Select
            value={values.packageId}
            onChange={(e) => patch({ packageId: e.target.value })}
            required
          >
            <option value="">Select a package…</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatPrice(p.basePrice)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            Notes (optional)
          </span>
          <Input
            type="text"
            value={values.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Birthday for Riley, allergic to peanuts, etc."
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
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
                className="rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-sunken)] p-3 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] data-[active]:border-[var(--color-action)] data-[active]:bg-[var(--color-action)] data-[active]:text-[var(--color-text-on-action)]"
              >
                {PAYMENT_LABEL[method]}
              </button>
            )
          })}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Total: <strong className="text-[var(--color-text-primary)]">{formatPrice(totalAmount)}</strong>
        </p>
      </section>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        Create walk-in booking
      </Button>
    </form>
  )
}
