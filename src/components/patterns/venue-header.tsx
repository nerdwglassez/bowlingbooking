'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

function cn(
  ...inputs: Array<string | undefined | null | false>
): string {
  return inputs.filter(Boolean).join(' ')
}

export type VenueHeaderProps = {
  venueName: string
  address: string
  signedIn?: boolean
  onSignIn?: () => void
  signInLabel?: string
  className?: string
}

export function VenueHeader({
  venueName,
  address,
  signedIn = false,
  onSignIn,
  signInLabel = 'Sign in',
  className,
}: VenueHeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-lg">{venueName}</h2>
        <p className="text-xs text-[var(--color-text-secondary)]">{address}</p>
      </div>
      {!signedIn && onSignIn ? (
        <Button variant="ghost" size="sm" onClick={onSignIn}>
          {signInLabel}
        </Button>
      ) : null}
    </header>
  )
}
