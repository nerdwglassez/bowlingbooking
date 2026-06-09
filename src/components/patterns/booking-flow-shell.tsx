'use client'

import type { ReactNode } from 'react'

import { HoldTimer } from '@/components/patterns/hold-timer'
import { StepIndicator } from '@/components/patterns/step-indicator'

import { BookingAppHeader } from './booking-app-header'

export type BookingFlowShellProps = {
  venueName: string
  address: string
  signInHref: string
  signedIn?: boolean
  currentStep: 1 | 2 | 3 | 4
  holdExpiresAt: Date | null
  onHoldExpire?: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * Booking steps 1–4 phone shell: stone chrome header, step strip, content, optional footer.
 * Wireframes: booking-step1-2-branded, step2-refined, step3-dropdown, step4-confirmation.
 */
export function BookingFlowShell({
  venueName,
  address,
  signInHref,
  signedIn,
  currentStep,
  holdExpiresAt,
  onHoldExpire,
  footer,
  children,
}: BookingFlowShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[var(--surface-ground)]">
      <BookingAppHeader
        venueName={venueName}
        address={address}
        signInHref={signInHref}
        signedIn={signedIn}
      />

      <div className="border-b border-[var(--color-border)] bg-[var(--surface-card)] px-5 py-2.5">
        <StepIndicator currentStep={currentStep} totalSteps={4} />
      </div>

      <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
        <HoldTimer
          expiresAt={holdExpiresAt}
          onExpire={onHoldExpire}
          className="-mx-5 mb-3.5 rounded-none border-x-0 border-t-0"
        />
        <div className="flex flex-1 flex-col gap-4">{children}</div>
        {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
      </div>
    </div>
  )
}
