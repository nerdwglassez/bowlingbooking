'use client'

// promo-form.tsx — Controlled form for admin promo create/edit.

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

export type PromoDiscountTypeField = 'PERCENT' | 'FIXED'

export interface PromoFormValues {
  code: string
  description: string
  discountType: PromoDiscountTypeField
  discountValue: number
  maxUsesEnabled: boolean
  maxUses: number
  expiresEnabled: boolean
  /** ISO string for datetime-local, or empty when disabled. */
  expiresAtLocal: string
}

export interface PromoFormProps {
  values: PromoFormValues
  onChange: (next: PromoFormValues) => void
  onSubmit: () => void
  submitting?: boolean
  error?: string | null
  successMessage?: string | null
  submitLabel?: string
}

export function PromoForm({
  values,
  onChange,
  onSubmit,
  submitting,
  error,
  successMessage,
  submitLabel = 'Save',
}: PromoFormProps) {
  function patch(update: Partial<PromoFormValues>) {
    onChange({ ...values, ...update })
  }

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
          Code
        </h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Promo code</span>
          <Input
            type="text"
            value={values.code}
            onChange={(e) => patch({ code: e.target.value })}
            placeholder="e.g. SUMMER25"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">
            Description (optional)
          </span>
          <Input
            type="text"
            value={values.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Shown to customers when applied"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Discount
        </h2>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="sr-only">Discount type</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="discountType"
              checked={values.discountType === 'PERCENT'}
              onChange={() => patch({ discountType: 'PERCENT' })}
            />
            <span>Percent off subtotal (1–100)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="discountType"
              checked={values.discountType === 'FIXED'}
              onChange={() => patch({ discountType: 'FIXED' })}
            />
            <span>Fixed amount in cents (e.g. 500 = $5.00)</span>
          </label>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--color-text-secondary)]">Value</span>
          <Input
            type="number"
            inputMode="numeric"
            value={values.discountValue || ''}
            onChange={(e) =>
              patch({
                discountValue: Number.parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Limits
        </h2>
        <Checkbox
          label="Limit total redemptions"
          checked={values.maxUsesEnabled}
          onChange={(e) => patch({ maxUsesEnabled: e.target.checked })}
        />
        {values.maxUsesEnabled ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Max uses</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={values.maxUses || ''}
              onChange={(e) =>
                patch({ maxUses: Number.parseInt(e.target.value, 10) || 0 })
              }
            />
          </label>
        ) : null}
        <Checkbox
          label="Set expiry (local time)"
          checked={values.expiresEnabled}
          onChange={(e) => patch({ expiresEnabled: e.target.checked })}
        />
        {values.expiresEnabled ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Expires</span>
            <Input
              type="datetime-local"
              value={values.expiresAtLocal}
              onChange={(e) => patch({ expiresAtLocal: e.target.value })}
            />
          </label>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{successMessage}</p>
      ) : null}

      <Button type="submit" variant="primary" loading={submitting}>
        {submitLabel}
      </Button>
    </form>
  )
}
