'use client'

import type { ReactNode } from 'react'

import { HoldTimer } from '@/components/patterns/hold-timer'
import { StepIndicator } from '@/components/patterns/step-indicator'
import {
  BOOKING_SHELL_NEG_MX,
  BOOKING_SHELL_PX,
} from '@/lib/booking-shell-layout'

import { BookingAppHeader } from './booking-app-header'
import { BookingSurface } from './booking-surface'

export type BookingFlowShellProps = {
  venueName: string
  address: string
  signInHref?: string
  showSignIn?: boolean
  signedIn?: boolean
  currentStep: 1 | 2 | 3 | 4
  holdExpiresAt: Date | null
  onHoldExpire?: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * Booking steps 1–4 shell: stone chrome header, step strip, content, optional footer.
 * Wireframes: booking-step1-2-branded, step2-refined, step3-dropdown, step4-confirmation.
 */
export function BookingFlowShell({
  venueName,
  address,
  signInHref,
  showSignIn,
  signedIn,
  currentStep,
  holdExpiresAt,
  onHoldExpire,
  footer,
  children,
}: BookingFlowShellProps) {
  return (
    <BookingSurface>
      <BookingAppHeader
        venueName={venueName}
        address={address}
        signInHref={signInHref}
        showSignIn={showSignIn}
        signedIn={signedIn}
      />

      <div
        className={[
          'border-b border-[var(--color-border)] bg-[var(--surface-card)] py-2.5',
          BOOKING_SHELL_PX,
        ].join(' ')}
      >
        <StepIndicator currentStep={currentStep} totalSteps={4} />
      </div>

      <div
        className={[
          'flex flex-1 flex-col pb-6 pt-4',
          BOOKING_SHELL_PX,
        ].join(' ')}
      >
        <HoldTimer
          expiresAt={holdExpiresAt}
          onExpire={onHoldExpire}
          className={[
            BOOKING_SHELL_NEG_MX,
            'mb-3.5 rounded-none border-x-0 border-t-0',
          ].join(' ')}
        />
        <div className="flex flex-1 flex-col gap-4">{children}</div>
        {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
      </div>
    </BookingSurface>
  )
}
