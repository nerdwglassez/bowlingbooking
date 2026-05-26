'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBooking } from '@/context/BookingContext'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import {
  acquireBookingHold,
  getAvailableDates,
  getAvailableTimeSlots,
  releaseBookingHold,
  type AvailableDate,
} from '@/lib/actions/booking'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { BowlerCounter } from '@/components/patterns/bowler-counter'
import { DateStrip } from '@/components/patterns/date-strip'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { PriceFooter } from '@/components/patterns/price-footer'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { TimeSlotGrid } from '@/components/patterns/time-slot-grid'
import { VenueHeader } from '@/components/patterns/venue-header'
import {
  formatBowlersLanesDateSummary,
} from '@/lib/booking-display'
import { STAFF_SIGN_IN_PATH } from '@/lib/auth-paths'
import { useWallClockNow } from '@/lib/use-wall-clock'
import type { PricingResult, TimeSlot } from '@/types'

const EMPTY_PRICING: PricingResult = {
  baseAmount: 0,
  gameAmount: 0,
  shoeAmount: 0,
  totalAmount: 0,
  lineItems: [],
}

// Server actions preserve Date instances over React Flight — see time page notes.

export default function BookStepOnePage() {
  const router = useRouter()
  const tenant = useTenant()
  const { session, setBowlerCount, setDate, setTimeSlot } = useBooking()
  const [dates, setDates] = useState<AvailableDate[]>([])
  const [datesPending, setDatesPending] = useState(true)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsPending, setSlotsPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await getAvailableDates(tenant.id, 7)
        if (!cancelled) setDates(next)
      } finally {
        if (!cancelled) setDatesPending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant.id])

  useEffect(() => {
    const date = session.date
    const bowlerCount = session.bowlerCount
    if (date == null || bowlerCount == null) {
      const clearId = window.setTimeout(() => {
        setSlots([])
        setSlotsPending(false)
      }, 0)
      return () => {
        window.clearTimeout(clearId)
      }
    }
    let cancelled = false
    void (async () => {
      if (!cancelled) {
        setSlotsPending(true)
        setSlots([])
      }
      try {
        const next = await getAvailableTimeSlots(
          tenant.id,
          date,
          bowlerCount,
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

  const wallNow = useWallClockNow()

  const leadSubtitle =
    session.bowlerCount != null && session.date != null
      ? formatBowlersLanesDateSummary(session.bowlerCount, session.date)
      : 'How many people, and when?'

  const canProceedToPackages =
    session.timeSlotId != null &&
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > wallNow

  const ctaLabel = canProceedToPackages
    ? 'Continue to packages →'
    : 'Select a date and time to continue'

  function handleNext() {
    if (!canProceedToPackages) return
    router.push('/book/package')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-48 pt-6">
      <VenueHeader
        venueName={tenant.name}
        address={tenant.address}
        onSignIn={() => {
          router.push(STAFF_SIGN_IN_PATH)
        }}
      />
      <StepIndicator currentStep={1} />
      <HoldTimer
        expiresAt={session.holdExpiresAt}
        onExpire={() => setTimeSlot(null, null)}
      />
      <BookingFlowLead
        title="Let's get you bowling"
        subtitle={leadSubtitle}
      />
      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Bowlers in your group
        </h2>
        <BowlerCounter
          value={session.bowlerCount ?? 1}
          onChange={setBowlerCount}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Pick a date
        </h2>
        {datesPending ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            Loading dates…
          </p>
        ) : (
          <DateStrip
            dates={dates}
            selectedDate={session.date}
            onSelect={setDate}
          />
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-sunken)] p-3">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Choose a time
        </h2>
        {session.date == null ? (
          <p
            className="py-4 text-center text-xs text-[var(--color-text-muted)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Select a date to see available times
          </p>
        ) : slotsPending ? (
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
      </section>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
        <PriceFooter
          pricing={EMPTY_PRICING}
          ctaLabel={ctaLabel}
          onCta={handleNext}
          ctaDisabled={!canProceedToPackages}
        />
      </div>
    </main>
  )
}
