'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  useLanePricingContext,
  useTenant,
} from '@/app/(customer)/book/tenant-provider'
import { BookingDetailsFooter } from '@/components/patterns/booking-details-footer'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { BookingFlowShell } from '@/components/patterns/booking-flow-shell'
import { ContactInfoSection } from '@/components/patterns/contact-info-section'
import {
  ShoeRentalSectionHeader,
  ShoeRentalTable,
} from '@/components/patterns/shoe-rental-table'
import { ShoesIncludedNotice } from '@/components/patterns/shoes-included-notice'
import { OwnShoesNotice } from '@/components/patterns/own-shoes-notice'
import { useBooking } from '@/context/BookingContext'
import { BOOKING_BACK_BY_STEP } from '@/lib/booking-flow-nav'
import { formatDetailsStepSubtitle } from '@/lib/booking-display'
import { isContactComplete } from '@/lib/customer-name'
import { calculateBookingTotal } from '@/lib/pricing'
import { OWN_SHOES_VALUE } from '@/lib/shoe-sizes'
import { useHoldExpiry } from '@/lib/use-hold-expiry'
import { useWallClockNow } from '@/lib/use-wall-clock'

export default function BookDetailsPage() {
  const router = useRouter()
  const tenant = useTenant()
  const {
    session,
    setTimeSlot,
    setShoeSelection,
    removeBowler,
    syncShoeRows,
    setBookingTotal,
    setCustomerInfo,
  } = useBooking()
  const now = useWallClockNow()
  const [emailTouched, setEmailTouched] = useState(false)

  useEffect(() => {
    syncShoeRows()
  }, [session.bowlerCount, syncShoeRows])

  const clearHold = useCallback(() => {
    setTimeSlot(null, null)
  }, [setTimeSlot])

  const handleHoldExpired = useHoldExpiry(clearHold)

  const shoesIncluded = session.selectedPackage?.shoesIncluded ?? false
  const shoesRequired = !shoesIncluded

  const laneReservationCents =
    (session.laneCount ?? 1) * tenant.laneReservationCentsPerLane
  const pricingContext = useLanePricingContext({
    bowlerCount: session.bowlerCount ?? 1,
    laneCount: session.laneCount ?? 1,
    startTime: session.startTime,
    endTime: session.endTime,
  })

  const pricing = useMemo(
    () =>
      calculateBookingTotal({
        package: session.selectedPackage,
        bowlerCount: session.bowlerCount ?? 1,
        laneCount: session.laneCount ?? 1,
        shoeSelections: session.shoeSelections,
        shoeRentalPriceCents: tenant.shoeRentalPriceCents,
        laneReservationCents: session.selectedPackage
          ? 0
          : laneReservationCents,
        selectedOptionalAddonIds: session.selectedOptionalAddonIds,
        pricingContext:
          session.selectedPackage == null ? pricingContext : undefined,
      }),
    [
      session.selectedPackage,
      session.bowlerCount,
      session.laneCount,
      session.shoeSelections,
      session.selectedOptionalAddonIds,
      tenant.shoeRentalPriceCents,
      laneReservationCents,
      pricingContext,
    ],
  )

  useEffect(() => {
    setBookingTotal(pricing.totalAmount)
  }, [pricing.totalAmount, setBookingTotal])

  const allShoesSelected = session.shoeSelections.every(
    (row) => row.size.length > 0,
  )
  const hasOwnShoesSelection = session.shoeSelections.some(
    (row) => row.size === OWN_SHOES_VALUE,
  )

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    session.customerEmail,
  )
  const contactComplete = isContactComplete(
    session.customerName,
    session.customerEmail,
  )

  const holdValid =
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > now

  const subtitle =
    session.bowlerCount != null &&
    session.date != null &&
    session.startTime != null
      ? formatDetailsStepSubtitle(
          session.bowlerCount,
          session.selectedPackage?.name ?? null,
          session.date,
          session.startTime,
        )
      : ''

  const needsHold = session.timeSlotId == null

  useEffect(() => {
    if (needsHold) router.replace('/book')
  }, [needsHold, router])

  if (needsHold) {
    return null
  }

  function handleNext() {
    if (!holdValid || !contactComplete) return
    if (shoesRequired && !allShoesSelected) return
    router.push('/book/confirm')
  }

  return (
    <BookingFlowShell
      venueName={tenant.name}
      address={tenant.address}
      currentStep={3}
      holdExpiresAt={session.holdExpiresAt}
      onHoldExpire={handleHoldExpired}
      footer={
        <BookingDetailsFooter
          shoeSelections={session.shoeSelections}
          shoesRequired={shoesRequired}
          contactComplete={contactComplete}
          holdValid={holdValid}
          onContinue={handleNext}
          back={BOOKING_BACK_BY_STEP[3]}
        />
      }
    >
      <BookingFlowLead title="Your details" subtitle={subtitle} />

      <ContactInfoSection
        customerName={session.customerName}
        customerEmail={session.customerEmail}
        customerPhone={session.customerPhone}
        editing={false}
        onEditingChange={() => {}}
        compact={false}
        onChange={setCustomerInfo}
        emailInvalid={emailTouched && !isEmailValid}
        onEmailBlur={() => setEmailTouched(true)}
      />

      <section className="flex flex-col gap-2">
        {shoesIncluded ? (
          <>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
              Shoe rental
            </h2>
            <ShoesIncludedNotice
              packageName={session.selectedPackage!.name}
            />
          </>
        ) : (
          <>
            <ShoeRentalSectionHeader
              shoeRentalPriceCents={tenant.shoeRentalPriceCents}
            />
            <ShoeRentalTable
              selections={session.shoeSelections}
              shoeRentalPriceCents={tenant.shoeRentalPriceCents}
              onSizeChange={(index, size, cost) =>
                setShoeSelection(index, size, cost)
              }
              onRemoveBowler={removeBowler}
              allComplete={allShoesSelected}
            />
            {hasOwnShoesSelection ? <OwnShoesNotice /> : null}
          </>
        )}
      </section>
    </BookingFlowShell>
  )
}
