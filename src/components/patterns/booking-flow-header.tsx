'use client'

import { VenueHeader } from '@/components/patterns/venue-header'

export type BookingFlowHeaderProps = {
  venueName: string
  address: string
  onSignIn?: () => void
  className?: string
}

/** Venue chrome for booking flow steps (no back nav — lives in step footers). */
export function BookingFlowHeader({
  venueName,
  address,
  onSignIn,
  className,
}: BookingFlowHeaderProps) {
  return (
    <VenueHeader
      className={className}
      venueName={venueName}
      address={address}
      onSignIn={onSignIn}
    />
  )
}
