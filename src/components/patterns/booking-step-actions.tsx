'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type BookingStepActionsProps = {
  backHref: string
  backLabel: string
  primaryLabel: string
  onPrimary?: () => void
  primaryDisabled?: boolean
  primaryLoading?: boolean
  primaryFormId?: string
  backDisabled?: boolean
  className?: string
}

/** Back + primary CTA row for booking steps 2–4. */
export function BookingStepActions({
  backHref,
  backLabel,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  primaryFormId,
  backDisabled,
  className,
}: BookingStepActionsProps) {
  const router = useRouter()

  return (
    <div
      className={['flex items-stretch gap-2', className]
        .filter(Boolean)
        .join(' ')}
    >
      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled={backDisabled}
        onClick={() => router.push(backHref)}
        className="shrink-0 gap-1 px-3"
        aria-label={`Back to ${backLabel}`}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        <span className="hidden min-[360px]:inline">{backLabel}</span>
      </Button>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        type={primaryFormId ? 'submit' : 'button'}
        form={primaryFormId}
        onClick={primaryFormId ? undefined : onPrimary}
        disabled={primaryDisabled}
        loading={primaryLoading}
        className="min-w-0 flex-1"
      >
        {primaryLabel}
      </Button>
    </div>
  )
}
