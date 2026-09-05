'use client'

import Link from 'next/link'

import { BOOKING_SHELL_PX } from '@/lib/booking-shell-layout'

export type BookingAppHeaderProps = {
  venueName: string
  address: string
  signInHref?: string
  showSignIn?: boolean
  signedIn?: boolean
}

export function BookingAppHeader({
  venueName,
  address,
  signInHref,
  showSignIn = false,
  signedIn = false,
}: BookingAppHeaderProps) {
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <header
      className={[
        'flex items-center gap-2.5 bg-[var(--surface-booking-chrome)] py-3.5',
        BOOKING_SHELL_PX,
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] leading-tight [font-family:var(--font-display)] text-[var(--color-text-inverted)]">
          {venueName}
        </h2>
        <a
          href={mapsHref}
          className="text-[10px] text-[var(--color-action-dark)] underline-offset-2 hover:underline"
        >
          {address}
        </a>
      </div>

      {showSignIn && !signedIn && signInHref ? (
        <Link
          href={signInHref}
          className="shrink-0 text-xs font-medium text-[var(--color-booking-chrome-link)]"
        >
          Sign in
        </Link>
      ) : null}
    </header>
  )
}
