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
}

export function PriceFooter({
  pricing,
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  className,
}: PriceFooterProps) {
  return (
    <Card variant="elevated" className={className}>
      <CardBody className="space-y-2">
        {pricing.lineItems.map((item, index) => (
          <div
            key={`${item.type}-${index}`}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-[var(--color-text-secondary)]">
              {item.label}
            </span>
            <span>{formatPrice(item.amount)}</span>
          </div>
        ))}
      </CardBody>
      <CardFooter className="flex-col items-stretch gap-3 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total</span>
          <span className="text-2xl font-semibold">
            {formatPrice(pricing.totalAmount)}
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
