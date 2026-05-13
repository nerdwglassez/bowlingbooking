'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { VenueHeader } from '@/components/patterns/venue-header'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { BookingSummaryCard } from '@/components/patterns/booking-summary-card'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { useBooking } from '@/context/BookingContext'
import {
  getBookingByPaymentIntentId,
  type BookingSummary,
} from '@/lib/actions/booking'

const POLL_INTERVAL_MS = 800
const POLL_MAX_ATTEMPTS = 12

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function formatTimeLabel(start: Date, end: Date): string {
  return `${TIME_FORMATTER.format(start).toLowerCase().replace(' ', '')} – ${TIME_FORMATTER.format(end).toLowerCase().replace(' ', '')}`
}

export default function BookingSuccessPage() {
  const params = useSearchParams()
  const paymentIntentId =
    params.get('payment_intent') ?? params.get('payment_intent_client_secret')
  const tenant = useTenant()
  const router = useRouter()
  const { resetSession } = useBooking()
  const [booking, setBooking] = useState<BookingSummary | null>(null)
  const [pollExhausted, setPollExhausted] = useState(false)

  const status: 'pending' | 'ready' | 'timeout' = !paymentIntentId
    ? 'timeout'
    : booking
      ? 'ready'
      : pollExhausted
        ? 'timeout'
        : 'pending'

  useEffect(() => {
    if (!paymentIntentId) return
    let cancelled = false
    let attempts = 0
    async function poll() {
      while (!cancelled && attempts < POLL_MAX_ATTEMPTS) {
        attempts++
        const found = await getBookingByPaymentIntentId(paymentIntentId!)
        if (cancelled) return
        if (found) {
          setBooking(found)
          return
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      }
      if (!cancelled) setPollExhausted(true)
    }
    void poll()
    return () => {
      cancelled = true
    }
  }, [paymentIntentId])

  useEffect(() => {
    if (status === 'ready') resetSession()
  }, [status, resetSession])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <VenueHeader
        venueName={tenant.name}
        address={tenant.address}
        onSignIn={() => {
          router.push('/signin')
        }}
      />
      <StepIndicator currentStep={4} />

      {status === 'pending' ? (
        <section className="flex flex-col items-center gap-3 pt-8 text-center">
          <h1 className="text-2xl">Confirming your booking…</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Stripe is finalizing your payment. This usually takes a few
            seconds.
          </p>
        </section>
      ) : null}

      {status === 'ready' && booking ? (
        <section className="flex flex-col gap-4">
          <h1 className="text-2xl">You&apos;re booked.</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Confirmation code{' '}
            <strong className="text-[var(--color-text-primary)]">
              {booking.confirmationCode}
            </strong>{' '}
            — we&apos;ve sent the details to{' '}
            <strong className="text-[var(--color-text-primary)]">
              {booking.customerEmail}
            </strong>
            .
          </p>
          <BookingSummaryCard
            dateLabel={DATE_FORMATTER.format(booking.startTime)}
            timeLabel={formatTimeLabel(booking.startTime, booking.endTime)}
            bowlerCount={booking.bowlerCount}
            laneCount={booking.laneCount}
            packageName={booking.packageName}
            totalAmount={booking.totalAmount}
          />
          <Button size="lg" fullWidth onClick={() => router.push('/')}>
            Done
          </Button>
          <Button variant="ghost" size="lg" fullWidth asChild>
            <a
              href={`/api/bookings/${booking.confirmationCode}/ics?email=${encodeURIComponent(booking.customerEmail)}`}
              download
            >
              Add to calendar
            </a>
          </Button>
        </section>
      ) : null}

      {status === 'timeout' ? (
        <section className="flex flex-col gap-3 pt-8 text-center">
          <h1 className="text-2xl">Just a moment longer.</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Your payment may still be processing. We&apos;ll send a
            confirmation email as soon as it&apos;s done. If you don&apos;t
            see it within five minutes, call {tenant.phone}.
          </p>
          <Button size="lg" fullWidth onClick={() => router.push('/')}>
            Back to home
          </Button>
        </section>
      ) : null}
    </main>
  )
}
