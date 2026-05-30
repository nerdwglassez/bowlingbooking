'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'

import { BookingSummaryCard } from '@/components/patterns/booking-summary-card'
import { VenueHeader } from '@/components/patterns/venue-header'
import { Button } from '@/components/ui/button'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { useBooking } from '@/context/BookingContext'
import { STAFF_SIGN_IN_PATH } from '@/lib/auth-paths'
import {
  getBookingByPaymentIntentId,
  getConfirmationQrDataUri,
  type BookingSummary,
} from '@/lib/actions/booking'
import { formatPrice } from '@/lib/pricing'

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
  const redirectStatus = params.get('redirect_status')
  const paymentIntentId =
    params.get('payment_intent') ?? params.get('payment_intent_client_secret')
  const tenant = useTenant()
  const router = useRouter()
  const { resetSession } = useBooking()
  const [booking, setBooking] = useState<BookingSummary | null>(null)
  const [pollExhausted, setPollExhausted] = useState(false)
  const [qrDataUri, setQrDataUri] = useState<string | null>(null)
  const [showAccountPrompt, setShowAccountPrompt] = useState(true)

  const authFailed = redirectStatus === 'failed'

  const status: 'auth_failed' | 'pending' | 'ready' | 'timeout' = authFailed
    ? 'auth_failed'
    : !paymentIntentId
      ? 'timeout'
      : booking
        ? 'ready'
        : pollExhausted
          ? 'timeout'
          : 'pending'

  useEffect(() => {
    if (authFailed || !paymentIntentId) return
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
  }, [authFailed, paymentIntentId])

  useEffect(() => {
    if (booking == null) return
    let cancelled = false
    void getConfirmationQrDataUri(booking.confirmationCode).then((uri) => {
      if (!cancelled) setQrDataUri(uri)
    })
    return () => {
      cancelled = true
    }
  }, [booking])

  useEffect(() => {
    if (status === 'ready') resetSession()
  }, [status, resetSession])

  const telHref = `tel:${tenant.phone.replace(/\D/g, '')}`

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-12 pt-6">
      <VenueHeader
        venueName={tenant.name}
        address={tenant.address}
        onSignIn={() => {
          router.push(STAFF_SIGN_IN_PATH)
        }}
      />

      {status === 'auth_failed' ? (
        <section className="flex flex-col gap-3 pt-8 text-center">
          <h1 className="text-2xl">Bank verification didn&apos;t complete</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Your card issuer didn&apos;t finish 3D Secure. No charge was
            completed. Return to checkout and try again, or use another card.
          </p>
          <Button
            size="lg"
            fullWidth
            onClick={() => router.push('/book/confirm')}
          >
            Back to payment
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={() => router.push('/')}>
            Back to home
          </Button>
        </section>
      ) : null}

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
          <div className="flex flex-col items-center gap-2 pt-4 text-center">
            <span
              className="flex size-14 items-center justify-center rounded-full bg-[var(--color-action-subtle)] text-[var(--color-action)]"
              aria-hidden
            >
              <Check className="size-8" strokeWidth={2.5} />
            </span>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Booking confirmed!
            </h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              We&apos;ve sent the details to{' '}
              <strong className="text-[var(--color-text-primary)]">
                {booking.customerEmail}
              </strong>
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-action)] bg-[var(--surface-card)] px-4 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              Confirmation code
            </p>
            <p
              className="mt-1 text-3xl font-bold tracking-wide text-[var(--color-text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {booking.confirmationCode}
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Show this at the front desk or quote it when calling
            </p>
          </div>

          {qrDataUri ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR data URI from server action */}
              <img
                src={qrDataUri}
                alt={`QR code for booking ${booking.confirmationCode}`}
                className="size-[200px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-raised)] p-2"
              />
            </div>
          ) : null}

          <BookingSummaryCard
            dateLabel={DATE_FORMATTER.format(booking.startTime)}
            timeLabel={formatTimeLabel(booking.startTime, booking.endTime)}
            bowlerCount={booking.bowlerCount}
            laneCount={booking.laneCount}
            packageName={booking.packageName}
            totalAmount={booking.totalAmount}
          />

          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            Total paid{' '}
            <strong className="text-[var(--color-text-primary)]">
              {formatPrice(booking.totalAmount)}
            </strong>
          </p>

          {showAccountPrompt ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-sunken)] px-4 py-3 text-sm">
              <p className="text-[var(--color-text-secondary)]">
                Want to cancel or reschedule without calling? Create a free
                account — takes 30 seconds.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push('/signin?from=/book/success')}
                >
                  Create account
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAccountPrompt(false)}
                >
                  Maybe later
                </Button>
              </div>
            </div>
          ) : null}

          <p className="text-center text-sm text-[var(--color-text-secondary)]">
            Need to make changes? Call us at{' '}
            <a
              href={telHref}
              className="font-semibold text-[var(--color-action)] underline underline-offset-2"
            >
              {tenant.phone}
            </a>
          </p>

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
            see it within five minutes, call{' '}
            <a href={telHref} className="font-semibold underline">
              {tenant.phone}
            </a>
            .
          </p>
          <Button size="lg" fullWidth onClick={() => router.push('/')}>
            Back to home
          </Button>
        </section>
      ) : null}
    </main>
  )
}
