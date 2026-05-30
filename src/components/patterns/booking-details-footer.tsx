'use client'

import type { ReactNode } from 'react'

import { BookingStepActions } from '@/components/patterns/booking-step-actions'
import { formatPrice } from '@/lib/pricing'
import { OWN_SHOES_VALUE } from '@/lib/shoe-sizes'
import type { LineItem, ShoeSelection } from '@/types'

export type BookingDetailsFooterProps = {
  packageLineItems: LineItem[]
  shoeSelections: ShoeSelection[]
  shoesRequired: boolean
  totalAmountCents: number
  contactComplete: boolean
  holdValid: boolean
  onContinue: () => void
  backHref: string
  backLabel: string
  className?: string
}

function firstPendingGuestIndex(selections: ShoeSelection[]): number {
  return selections.findIndex((row) => row.size.length === 0)
}

function rentalCount(selections: ShoeSelection[]): number {
  return selections.filter(
    (row) => row.size.length > 0 && row.size !== OWN_SHOES_VALUE,
  ).length
}

function rentalTotalCents(selections: ShoeSelection[]): number {
  return selections.reduce((sum, row) => sum + row.cost, 0)
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
    return 'Complete contact information'
  }
  return 'Continue to payment →'
}

export function BookingDetailsFooter({
  packageLineItems,
  shoeSelections,
  shoesRequired,
  totalAmountCents,
  contactComplete,
  holdValid,
  onContinue,
  backHref,
  backLabel,
  className,
}: BookingDetailsFooterProps) {
  const allShoesSelected = shoeSelections.every((row) => row.size.length > 0)
  const rentals = rentalCount(shoeSelections)
  const rentalCents = rentalTotalCents(shoeSelections)
  const pendingCount = shoeSelections.filter((row) => row.size.length === 0).length

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

  let shoeLineLabel = 'Shoe rental'
  let shoeLineValue: ReactNode = null
  let totalLabel: ReactNode = formatPrice(totalAmountCents)

  if (!shoesRequired) {
    shoeLineValue = (
      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
        Included
      </span>
    )
  } else if (rentals === 0) {
    shoeLineValue = (
      <span className="text-[11px] font-medium italic text-[var(--color-text-secondary)]">
        Pending selection
      </span>
    )
    totalLabel = (
      <span className="text-[15px] text-[var(--color-text-secondary)]">
        Select all sizes
      </span>
    )
  } else if (pendingCount > 0) {
    shoeLineLabel = `Shoe rental · ${rentals} confirmed`
    shoeLineValue = (
      <span className="text-[11px] font-medium text-[var(--color-action-dark)]">
        +{formatPrice(rentalCents)}
      </span>
    )
    totalLabel = (
      <span className="text-[15px] text-[var(--color-text-secondary)]">
        {pendingCount === 1
          ? '1 guest remaining'
          : `${pendingCount} guests remaining`}
      </span>
    )
  } else {
    shoeLineLabel = `Shoe rental · ${rentals} ${rentals === 1 ? 'person' : 'people'}`
    shoeLineValue = (
      <span className="text-[11px] font-medium text-[var(--color-action-dark)]">
        +{formatPrice(rentalCents)}
      </span>
    )
  }

  return (
    <footer
      className={[
        'rounded-[var(--radius-lg)] bg-[var(--surface-dark)] px-5 pb-[18px] pt-[13px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {packageLineItems.map((item, index) => (
        <div
          key={`${item.type}-${index}`}
          className="mb-1 flex items-center justify-between"
        >
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {item.label}
          </span>
          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
            {formatPrice(item.amount)}
          </span>
        </div>
      ))}

      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {shoeLineLabel}
        </span>
        {shoeLineValue}
      </div>

      <hr className="my-2 border-0 border-t border-[var(--color-border-strong)]" />

      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Estimated total
        </span>
        <span
          className="text-[19px] text-[var(--color-action-dark)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {totalLabel}
        </span>
      </div>

      <BookingStepActions
        backHref={backHref}
        backLabel={backLabel}
        primaryLabel={ctaLabel}
        onPrimary={onContinue}
        primaryDisabled={!canProceed}
      />
    </footer>
  )
}
