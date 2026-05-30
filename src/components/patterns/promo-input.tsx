'use client'

// promo-input.tsx — Controlled promo entry for checkout (no local state).

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/pricing'

export interface PromoInputProps {
  value: string
  onChange: (next: string) => void
  onApply: () => void
  onClear: () => void
  appliedCode: string | null
  discountCents: number | null
  error: string | null
  loading?: boolean
  disabled?: boolean
  placeholder?: string
}

export function PromoInput({
  value,
  onChange,
  onApply,
  onClear,
  appliedCode,
  discountCents,
  error,
  loading,
  disabled,
  placeholder = 'Have a promo code?',
}: PromoInputProps) {
  const applied = appliedCode != null && discountCents != null && discountCents > 0

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        Promo code
      </h2>
      {applied ? (
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium text-[var(--color-text-primary)]">
                {appliedCode!.toUpperCase()}
              </span>
              <span className="text-sm font-medium text-[var(--status-error-text)]">
                {formatPrice(-discountCents!)}
              </span>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-[var(--radius-sm)] px-2 py-1 text-lg leading-none text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--color-text-primary)]"
              onClick={onClear}
              aria-label="Remove promo code"
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || loading}
            className="sm:flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={onApply}
            loading={loading}
            disabled={disabled || !value.trim()}
            className="sm:w-auto"
          >
            Apply
          </Button>
        </div>
      )}
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
    </section>
  )
}
