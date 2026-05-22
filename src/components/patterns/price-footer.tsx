'use client'

import { Button } from '@/components/ui/button'
import { Card, CardBody, CardFooter } from '@/components/ui/card'
import { formatPrice } from '@/lib/pricing'
import type { PricingResult } from '@/types'

export type PriceFooterProps = {
  pricing: PricingResult
  ctaLabel: string
  onCta: () => void
  ctaDisabled?: boolean
  ctaLoading?: boolean
  className?: string
  /** Integer cents; defaults to `pricing.totalAmount` when omitted. */
  finalTotalCents?: number
  /** When set with a positive discount, replaces line-item breakdown with subtotal / promo / total rows. */
  promoLine?: { code: string; discountCents: number } | null
}

export function PriceFooter({
  pricing,
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  className,
  finalTotalCents,
  promoLine,
}: PriceFooterProps) {
  const totalCents = finalTotalCents ?? pricing.totalAmount
  const showPromoSummary =
    promoLine != null && promoLine.discountCents > 0

  return (
    <Card variant="elevated" className={className}>
      <CardBody className="space-y-2">
        {showPromoSummary ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">Subtotal</span>
              <span>{formatPrice(pricing.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">
                Promo ({promoLine.code.toUpperCase()})
              </span>
              <span className="text-[var(--status-error-text)]">
                {formatPrice(-promoLine.discountCents)}
              </span>
            </div>
          </>
        ) : (
          pricing.lineItems.map((item, index) => (
            <div
              key={`${item.type}-${index}`}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-[var(--color-text-secondary)]">
                {item.label}
              </span>
              <span>{formatPrice(item.amount)}</span>
            </div>
          ))
        )}
      </CardBody>
      <CardFooter className="flex-col items-stretch gap-3 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-2xl font-semibold">
            {formatPrice(totalCents)}
          </span>
        </div>
        <Button
          variant="primary"
          fullWidth
          onClick={onCta}
          disabled={ctaDisabled}
          loading={ctaLoading}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
