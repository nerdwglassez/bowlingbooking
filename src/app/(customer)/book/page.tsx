'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBooking } from '@/context/BookingContext'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import {
  getAvailableDates,
  type AvailableDate,
} from '@/lib/actions/booking'
import { BowlerCounter } from '@/components/patterns/bowler-counter'
import { DateStrip } from '@/components/patterns/date-strip'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { PriceFooter } from '@/components/patterns/price-footer'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { VenueHeader } from '@/components/patterns/venue-header'
import type { PricingResult } from '@/types'

const EMPTY_PRICING: PricingResult = {
  baseAmount: 0,
  gameAmount: 0,
  shoeAmount: 0,
  totalAmount: 0,
  lineItems: [],
}

export default function BookStepOnePage() {
  const router = useRouter()
  const tenant = useTenant()
  const { session, setBowlerCount, setDate } = useBooking()
  const [dates, setDates] = useState<AvailableDate[]>([])
  const [datesPending, setDatesPending] = useState(true)

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

  const canProceed =
    (session.bowlerCount ?? 0) >= 1 && session.date != null

  function handleNext() {
    router.push('/book/time')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-6">
      <VenueHeader venueName={tenant.name} address={tenant.address} />
      <StepIndicator currentStep={1} />
      <HoldTimer expiresAt={null} />
      <h1 className="text-2xl">Let&apos;s get you bowling</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        How many people are in your group?
      </p>
      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Bowlers
        </h2>
        <BowlerCounter
          value={session.bowlerCount ?? 1}
          onChange={setBowlerCount}
        />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Date
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
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
        <PriceFooter
          pricing={EMPTY_PRICING}
          ctaLabel="Choose time"
          onCta={handleNext}
          ctaDisabled={!canProceed}
        />
      </div>
    </main>
  )
}
