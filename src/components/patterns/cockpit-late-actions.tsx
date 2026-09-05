'use client'

import { Button } from '@/components/base/buttons/button'

export type CockpitLateActionsProps = {
  firstLateBookingId: string
  onOpenBooking?: (bookingId: string) => void
}

export function CockpitLateActions({
  firstLateBookingId,
  onOpenBooking,
}: CockpitLateActionsProps) {
  const href = `/staff/bookings/${firstLateBookingId}`

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {onOpenBooking ? (
        <>
          <Button
            type="button"
            color="secondary"
            size="md"
            className="flex-1"
            onClick={() => onOpenBooking(firstLateBookingId)}
          >
            Check in late arrivals
          </Button>
          <Button
            type="button"
            color="primary-destructive"
            size="md"
            className="flex-1"
            onClick={() => onOpenBooking(firstLateBookingId)}
          >
            Cancel to free lanes
          </Button>
        </>
      ) : (
        <>
          <Button href={href} color="secondary" size="md" className="flex-1">
            Check in late arrivals
          </Button>
          <Button
            href={href}
            color="primary-destructive"
            size="md"
            className="flex-1"
          >
            Cancel to free lanes
          </Button>
        </>
      )}
    </div>
  )
}
