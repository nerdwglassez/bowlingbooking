'use client'

import { BookingFlowFooter } from '@/components/patterns/booking-flow-footer'
import type { BookingBackTarget } from '@/lib/booking-flow-nav'
import type { ShoeSelection } from '@/types'

export type BookingDetailsFooterProps = {
  shoeSelections: ShoeSelection[]
  shoesRequired: boolean
  contactComplete: boolean
  holdValid: boolean
  onContinue: () => void
  back?: BookingBackTarget
  className?: string
}

function firstPendingGuestIndex(selections: ShoeSelection[]): number {
  return selections.findIndex((row) => row.size.length === 0)
}

function buildCtaLabel(
  shoesRequired: boolean,
  allShoesSelected: boolean,
  contactComplete: boolean,
  selections: ShoeSelection[],
): string {
  if (shoesRequired && !allShoesSelected) {
    const pending = firstPendingGuestIndex(selections)
    if (pending === 0 && selections.every((row) => row.size.length === 0)) {
      return 'Select shoe size for all guests'
    }
    return `Select size for Guest ${pending + 1}`
  }
  if (!contactComplete) {
    return 'Add contact details'
  }
  return 'Continue to payment →'
}

export function BookingDetailsFooter({
  shoeSelections,
  shoesRequired,
  contactComplete,
  holdValid,
  onContinue,
  back,
  className,
}: BookingDetailsFooterProps) {
  const allShoesSelected = shoeSelections.every((row) => row.size.length > 0)
  const canProceed =
    holdValid &&
    contactComplete &&
    (!shoesRequired || allShoesSelected)

  const ctaLabel = buildCtaLabel(
    shoesRequired,
    allShoesSelected,
    contactComplete,
    shoeSelections,
  )

  return (
    <BookingFlowFooter
      className={className}
      ctaLabel={ctaLabel}
      onCta={onContinue}
      ctaDisabled={!canProceed}
      back={back}
    />
  )
}
