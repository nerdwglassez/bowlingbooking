'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { VenueHeader } from '@/components/patterns/venue-header'
import { buttonVariants } from '@/components/ui/button'

export type BookingFlowStep = 1 | 2 | 3 | 4

const BACK_BY_STEP: Record<
  BookingFlowStep,
  { href: string; label: string } | null
> = {
  1: null,
  2: { href: '/book', label: 'Date & time' },
  3: { href: '/book/package', label: 'Packages' },
  4: { href: '/book/details', label: 'Shoe sizing' },
}

export type BookingFlowHeaderProps = {
  step: BookingFlowStep
  venueName: string
  address: string
  onSignIn?: () => void
  className?: string
}

/**
 * Venue chrome + optional back chevron. Back navigation does not release
 * the booking hold (BOOKING_INTERACTIONS.md §Navigation between steps).
 */
export function BookingFlowHeader({
  step,
  venueName,
  address,
  onSignIn,
  className,
}: BookingFlowHeaderProps) {
  const router = useRouter()
  const back = BACK_BY_STEP[step]

  return (
    <div className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}>
      {back ? (
        <button
          type="button"
          className={[
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            '-ml-2 w-fit gap-1 px-2',
          ].join(' ')}
          onClick={() => router.push(back.href)}
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          <span>{back.label}</span>
        </button>
      ) : null}
      <VenueHeader
        venueName={venueName}
        address={address}
        onSignIn={onSignIn}
      />
    </div>
  )
}
