'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { redirect, useRouter } from 'next/navigation'
import { useBooking } from '@/context/BookingContext'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import {
  acquireBookingHold,
  getAvailableTimeSlots,
  releaseBookingHold,
} from '@/lib/actions/booking'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { PriceFooter } from '@/components/patterns/price-footer'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { TimeSlotGrid } from '@/components/patterns/time-slot-grid'
import { VenueHeader } from '@/components/patterns/venue-header'
import { formatBowlersLanesDateSummary } from '@/lib/booking-display'
import { useWallClockNow } from '@/lib/use-wall-clock'
import type { PricingResult, TimeSlot } from '@/types'

const EMPTY_PRICING: PricingResult = {
  baseAmount: 0,
  gameAmount: 0,
  shoeAmount: 0,
  totalAmount: 0,
  lineItems: [],
}

// Note on Date serialization: server actions in Next 16 use the React Flight
// wire format, which preserves Date instances (along with Map/Set/BigInt/
// typed arrays). We therefore trust that values typed as `Date` round-trip as
// real `Date` objects and do NOT defensively re-wrap with `new Date(...)`.
// If a server action ever returns an ISO string instead of a Date, fix it at
// the action — don't normalize per-consumer.

export default function BookTimePage() {
  const router = useRouter()
  const tenant = useTenant()
  const { session, setTimeSlot } = useBooking()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsPending, setSlotsPending] = useState(true)

  useEffect(() => {
    if (session.date == null || session.bowlerCount == null) {
      return
    }
    let cancelled = false
    void (async () => {
      if (!cancelled) setSlotsPending(true)
      try {
        const next = await getAvailableTimeSlots(
          tenant.id,
          session.date!,
          session.bowlerCount!,
        )
        if (!cancelled) setSlots(next)
      } finally {
        if (!cancelled) setSlotsPending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant.id, session.date, session.bowlerCount])

  const previousHoldIdRef = useRef<string | null>(null)
  useEffect(() => {
    previousHoldIdRef.current = session.holdId
  }, [session.holdId])

  const handleSlotSelect = useCallback(
    async (slot: TimeSlot) => {
      if (session.bowlerCount == null) return
      const oldHoldId = previousHoldIdRef.current
      const { holdId, expiresAt } = await acquireBookingHold({
        tenantId: tenant.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        bowlerCount: session.bowlerCount,
      })
      setTimeSlot(slot, { id: holdId, expiresAt })
      if (oldHoldId && oldHoldId !== holdId) {
        void releaseBookingHold(oldHoldId)
      }
    },
    [session.bowlerCount, setTimeSlot, tenant.id],
  )

  const handleNext = useCallback(() => {
    router.push('/book/package')
  }, [router])

  const wallNow = useWallClockNow()

  if (session.bowlerCount == null || session.date == null) {
    redirect('/book')
  }

  const schedulingSubtitle =
    session.bowlerCount != null && session.date != null
      ? formatBowlersLanesDateSummary(session.bowlerCount, session.date)
      : ''

  const canProceed =
    session.timeSlotId != null &&
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > wallNow

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-6">
      <VenueHeader
        venueName={tenant.name}
        address={tenant.address}
        onSignIn={() => {
          router.push('/signin')
        }}
      />
      <StepIndicator currentStep={1} />
      <HoldTimer
        expiresAt={session.holdExpiresAt}
        onExpire={() => setTimeSlot(null, null)}
      />

      <BookingFlowLead
        title="Let's get you bowling"
        subtitle={schedulingSubtitle}
      />
      <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        Choose a time
      </h2>

      {slotsPending ? (
        <p className="text-sm text-[var(--color-text-secondary)]">
          Loading times…
        </p>
      ) : (
        <TimeSlotGrid
          slots={slots}
          selectedSlotId={session.timeSlotId}
          onSelect={handleSlotSelect}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
        <PriceFooter
          pricing={EMPTY_PRICING}
          ctaLabel="Continue to packages →"
          onCta={handleNext}
          ctaDisabled={!canProceed}
        />
      </div>
    </main>
  )
}
