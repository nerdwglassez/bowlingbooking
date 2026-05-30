'use client'

import { BookingStepActions } from '@/components/patterns/booking-step-actions'
import { formatPrice } from '@/lib/pricing'
import type { LineItem } from '@/types'

export type PaymentPriceFooterProps = {
  lineItems: LineItem[]
  promoLine?: { code: string; discountCents: number } | null
  totalCents: number
  ctaLabel: string
  onPay: () => void
  ctaDisabled?: boolean
  ctaLoading?: boolean
  formId?: string
  backHref: string
  backLabel: string
  backDisabled?: boolean
  policyNote?: string
  className?: string
}

export function PaymentPriceFooter({
  lineItems,
  promoLine,
  totalCents,
  ctaLabel,
  onPay,
  ctaDisabled,
  ctaLoading,
  formId,
  backHref,
  backLabel,
  backDisabled,
  policyNote = 'By paying you agree to our cancellation policy',
  className,
}: PaymentPriceFooterProps) {
  const hasPromo =
    promoLine != null && promoLine.discountCents > 0

  return (
    <footer
      className={[
        'rounded-[var(--radius-lg)] bg-[var(--surface-dark)] px-5 pb-[18px] pt-[13px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasPromo ? (
        <>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Subtotal
            </span>
            <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
              {formatPrice(
                lineItems.reduce((sum, item) => sum + item.amount, 0),
              )}
            </span>
          </div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Promo {promoLine!.code.toUpperCase()}
            </span>
            <span className="text-[11px] font-medium text-[var(--status-ok-text)]">
              {formatPrice(-promoLine!.discountCents)}
            </span>
          </div>
        </>
      ) : (
        lineItems.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            className="mb-1 flex items-center justify-between"
          >
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {item.label}
            </span>
            <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
              {item.amount === 0 && item.type === 'shoe'
                ? 'Included'
                : formatPrice(item.amount)}
            </span>
          </div>
        ))
      )}

      <hr className="my-2 border-0 border-t border-[var(--color-border-strong)]" />

      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Total due today
        </span>
        <span
          className="text-[19px] text-[var(--color-action-dark)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {formatPrice(totalCents)}
        </span>
      </div>

      <BookingStepActions
        backHref={backHref}
        backLabel={backLabel}
        backDisabled={backDisabled}
        primaryLabel={ctaLabel}
        onPrimary={onPay}
        primaryFormId={formId}
        primaryDisabled={ctaDisabled}
        primaryLoading={ctaLoading}
      />

      {policyNote ? (
        <p className="mt-1.5 text-center text-[10px] text-[var(--color-text-secondary)]">
          {policyNote}
        </p>
      ) : null}
    </footer>
  )
}
