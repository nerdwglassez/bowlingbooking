'use client'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import type { BookingBackTarget } from '@/lib/booking-flow-nav'

export type BookingFlowFooterProps = {
  ctaLabel: string
  onCta?: () => void
  ctaDisabled?: boolean
  ctaLoading?: boolean
  ctaFormId?: string
  note?: string
  back?: BookingBackTarget
  className?: string
}

/** Stone chrome sticky footer — primary CTA, optional secondary back below. Steps 2–4. */
export function BookingFlowFooter({
  ctaLabel,
  onCta,
  ctaDisabled,
  ctaLoading,
  ctaFormId,
  note,
  back,
  className,
}: BookingFlowFooterProps) {
  const router = useRouter()

  return (
    <footer
      className={[
        '-mx-5 bg-[var(--surface-booking-chrome)] px-5 pb-[18px] pt-[13px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Button
        type={ctaFormId ? 'submit' : 'button'}
        form={ctaFormId}
        variant="primary"
        size="lg"
        fullWidth
        onClick={ctaFormId ? undefined : onCta}
        disabled={ctaDisabled}
        loading={ctaLoading}
      >
        {ctaLabel}
      </Button>

      {note ? (
        <p className="mt-1.5 text-center text-[10px] text-[var(--color-text-muted)]">
          {note}
        </p>
      ) : null}

      {back ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          fullWidth
          className="mt-2.5"
          onClick={() => router.push(back.href)}
        >
          ← {back.label}
        </Button>
      ) : null}
    </footer>
  )
}
