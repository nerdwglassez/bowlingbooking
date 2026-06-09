'use client'

import { BookingFlowFooter } from '@/components/patterns/booking-flow-footer'
import type { BookingBackTarget } from '@/lib/booking-flow-nav'

export type PaymentPriceFooterProps = {
  ctaLabel: string
  onPay: () => void
  ctaDisabled?: boolean
  ctaLoading?: boolean
  formId?: string
  policyNote?: string
  back?: BookingBackTarget
  className?: string
}

export function PaymentPriceFooter({
  ctaLabel,
  onPay,
  ctaDisabled,
  ctaLoading,
  formId,
  policyNote = 'By paying you agree to our cancellation policy',
  back,
  className,
}: PaymentPriceFooterProps) {
  return (
    <BookingFlowFooter
      className={className}
      ctaLabel={ctaLabel}
      onCta={onPay}
      ctaFormId={formId}
      ctaDisabled={ctaDisabled}
      ctaLoading={ctaLoading}
      note={policyNote}
      back={back}
    />
  )
}
