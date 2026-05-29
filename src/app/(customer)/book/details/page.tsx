'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { BookingFlowHeader } from '@/components/patterns/booking-flow-header'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { OwnShoesNotice } from '@/components/patterns/own-shoes-notice'
import { PriceFooter } from '@/components/patterns/price-footer'
import { ShoeSizeRow } from '@/components/patterns/shoe-size-row'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { useBooking } from '@/context/BookingContext'
import { STAFF_SIGN_IN_PATH } from '@/lib/auth-paths'
import { formatPackageStepSubtitle } from '@/lib/booking-display'
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
  } = useBooking()
  const now = useWallClockNow()

  useEffect(() => {
    syncShoeRows()
  }, [syncShoeRows])

  const clearHold = useCallback(() => {
    setTimeSlot(null, null)
  }, [setTimeSlot])

  const handleHoldExpired = useHoldExpiry(clearHold)

  const laneReservationCents =
    (session.laneCount ?? 1) * tenant.laneReservationCentsPerLane

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
      }),
    [
      session.selectedPackage,
      session.bowlerCount,
      session.laneCount,
      session.shoeSelections,
      session.selectedOptionalAddonIds,
      tenant.shoeRentalPriceCents,
      laneReservationCents,
    ],
  )

  useEffect(() => {
    setBookingTotal(pricing.totalAmount)
  }, [pricing.totalAmount, setBookingTotal])

  const allShoesSelected = session.shoeSelections.every(
    (row) => row.size.length > 0,
  )

  const showOwnShoesNotice = session.shoeSelections.some(
    (row) => row.size === OWN_SHOES_VALUE,
  )

  const holdValid =
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > now

  const subtitle =
    session.bowlerCount != null &&
    session.date != null &&
    session.startTime != null
      ? formatPackageStepSubtitle(
          session.bowlerCount,
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
    if (!allShoesSelected || !holdValid) return
    router.push('/book/confirm')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-6">
      <BookingFlowHeader
        step={3}
        venueName={tenant.name}
        address={tenant.address}
        onSignIn={() => router.push(STAFF_SIGN_IN_PATH)}
      />
      <StepIndicator currentStep={3} />
      <HoldTimer
        expiresAt={session.holdExpiresAt}
        onExpire={handleHoldExpired}
      />

      <BookingFlowLead title="Shoe sizing" subtitle={subtitle} />

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Size for each bowler
        </h2>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-card)] px-3">
          {session.shoeSelections.map((row, index) => (
            <ShoeSizeRow
              key={row.bowlerId}
              bowlerIndex={index}
              size={row.size}
              shoeRentalPriceCents={tenant.shoeRentalPriceCents}
              canRemove={session.shoeSelections.length > 1}
              onSizeChange={(size, cost) =>
                setShoeSelection(index, size, cost)
              }
              onRemove={() => removeBowler(index)}
            />
          ))}
        </div>
        {showOwnShoesNotice ? <OwnShoesNotice /> : null}
        {!allShoesSelected ? (
          <p className="text-xs text-[var(--color-text-secondary)]">
            Select shoe size for each bowler
          </p>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
        <PriceFooter
          pricing={pricing}
          ctaLabel="Continue to checkout"
          onCta={handleNext}
          ctaDisabled={!allShoesSelected || !holdValid}
        />
      </div>
    </main>
  )
}
