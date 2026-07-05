'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'

import { BookingAppHeader } from '@/components/patterns/booking-app-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { useBooking } from '@/context/BookingContext'
import {
  getBookingByConfirmationCode,
  getBookingByPaymentIntentId,
  type BookingSummary,
} from '@/lib/actions/booking'
import { claimBookingAccountAction } from '@/lib/actions/claim'
import { STAFF_SIGN_IN_PATH } from '@/lib/auth-paths'
import { formatPrice } from '@/lib/pricing'

const POLL_INTERVAL_MS = 800
const POLL_MAX_ATTEMPTS = 12
const CELEBRATE_DISMISS_KEY = 'rzl-celebrate-dismissed'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function formatDurationLabel(start: Date, end: Date): string {
  const hours = Math.round((end.getTime() - start.getTime()) / 3_600_000)
  if (hours <= 0) return ''
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

function formatTimeLabel(start: Date): string {
  return TIME_FORMATTER.format(start)
}

function ConfDetailRow({
  icon,
  label,
  value,
  sub,
  subHref,
}: {
  icon: string
  label: string
  value: string
  sub?: string
  subHref?: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-[15px] py-3 last:border-b-0">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-sunken)] text-sm"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="text-[13px] font-medium leading-snug text-[var(--color-text-primary)]">
          {value}
        </p>
        {sub ? (
          subHref ? (
            <a
              href={subHref}
              className="mt-0.5 block text-[11px] text-[var(--color-action)] underline underline-offset-2"
            >
              {sub}
            </a>
          ) : (
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {sub}
            </p>
          )
        ) : null}
      </div>
    </div>
  )
}

export function BookingSuccessClient({ signedIn }: { signedIn: boolean }) {
  const params = useSearchParams()
  const redirectStatus = params.get('redirect_status')
  const offlineCode = params.get('code')
  const offlineEmail = params.get('email')
  const offlinePending = params.get('pending') === '1'
  const claimToken = params.get('claim_token')
  const paymentIntentId =
    params.get('payment_intent') ?? params.get('payment_intent_client_secret')
  const [claimPassword, setClaimPassword] = useState('')
  const [claimPending, setClaimPending] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(CELEBRATE_DISMISS_KEY) === '1'
  })
  const tenant = useTenant()
  const router = useRouter()
  const { resetSession } = useBooking()
  const [booking, setBooking] = useState<BookingSummary | null>(null)
  const [pollExhausted, setPollExhausted] = useState(false)
  const [showAccountPrompt, setShowAccountPrompt] = useState(
    !signedIn && Boolean(claimToken),
  )
  const [accountExpanded, setAccountExpanded] = useState(true)

  const authFailed = redirectStatus === 'failed'
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tenant.address)}`
  const telHref = `tel:${tenant.phone.replace(/\D/g, '')}`

  const status: 'auth_failed' | 'pending' | 'ready' | 'timeout' = authFailed
    ? 'auth_failed'
    : offlineCode && offlineEmail
      ? booking
        ? 'ready'
        : 'pending'
      : !paymentIntentId
        ? 'timeout'
        : booking
          ? 'ready'
          : pollExhausted
            ? 'timeout'
            : 'pending'

  useEffect(() => {
    if (offlineCode && offlineEmail) {
      let cancelled = false
      void getBookingByConfirmationCode(offlineCode, offlineEmail).then(
        (found) => {
          if (!cancelled && found) setBooking(found)
        },
      )
      return () => {
        cancelled = true
      }
    }
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
  }, [authFailed, paymentIntentId, offlineCode, offlineEmail])

  useEffect(() => {
    if (status === 'ready') resetSession()
  }, [status, resetSession])

  function dismissCelebration() {
    sessionStorage.setItem(CELEBRATE_DISMISS_KEY, '1')
    setBannerDismissed(true)
  }

  async function handleCreateAccount() {
    if (!booking) return
    setClaimError(null)
    setClaimPending(true)
    try {
      if (!claimToken) {
        throw new Error(
          'Use the account link from your confirmation email to create an account.',
        )
      }
      await claimBookingAccountAction({
        token: claimToken,
        password: claimPassword,
        name: booking.customerEmail.split('@')[0],
      })
      router.push('/dashboard')
    } catch (err) {
      setClaimError(
        err instanceof Error ? err.message : 'Could not create account.',
      )
    } finally {
      setClaimPending(false)
    }
  }

  const showCelebration =
    status === 'ready' && booking && !offlinePending && !bannerDismissed

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <BookingAppHeader
        venueName={tenant.name}
        address={tenant.address}
        signInHref={STAFF_SIGN_IN_PATH}
        signedIn={signedIn}
      />

      {showCelebration ? (
        <div className="flex shrink-0 items-center gap-2.5 bg-[var(--status-ok-text)] px-5 py-3.5">
          <span className="text-xl" aria-hidden>
            🎉
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="text-base leading-tight text-[var(--status-ok-bg)] [font-family:var(--font-display)]"
            >
              You&apos;re booked!
            </p>
            <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--status-ok-bg)_80%,transparent)]">
              Confirmation sent to {booking.customerEmail}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-lg leading-none text-[color-mix(in_srgb,var(--status-ok-bg)_60%,transparent)]"
            aria-label="Dismiss"
            onClick={dismissCelebration}
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>
      ) : null}

      {status === 'ready' && booking && offlinePending ? (
        <div className="flex shrink-0 items-center gap-2.5 bg-[var(--surface-booking-chrome)] px-5 py-3.5">
          <span className="text-lg" aria-hidden>
            🤝
          </span>
          <div>
            <p
              className="text-[15px] leading-tight text-[var(--color-text-inverted)] [font-family:var(--font-display)]"
            >
              Reservation held
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              Awaiting payment confirmation from venue
            </p>
          </div>
        </div>
      ) : null}

      <main className="flex flex-1 flex-col gap-3 px-4 pb-12 pt-4">
        {status === 'auth_failed' ? (
          <section className="flex flex-col gap-3 pt-4 text-center">
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
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => router.push('/')}
            >
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
          <section className="flex flex-col gap-3">
            <div className="rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--surface-card)] px-4 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                {offlinePending ? 'Reservation code' : 'Confirmation code'}
              </p>
              <p
                className="mt-2 text-[28px] tracking-wide text-[var(--color-text-primary)] [font-family:var(--font-display)]"
              >
                {booking.confirmationCode}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                {offlinePending
                  ? 'Quote this when arranging payment with the venue'
                  : 'Show this at the front desk or quote it when calling'}
              </p>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--surface-card)]">
              <ConfDetailRow
                icon="📅"
                label="Date & time"
                value={`${DATE_FORMATTER.format(booking.startTime)} · ${formatTimeLabel(booking.startTime)}`}
                sub={`Duration: ${formatDurationLabel(booking.startTime, booking.endTime)}`}
              />
              <ConfDetailRow
                icon="🎳"
                label="Booking details"
                value={`${booking.bowlerCount} bowlers · ${booking.packageName}`}
                sub={`${booking.laneCount} ${booking.laneCount === 1 ? 'lane' : 'lanes'}`}
              />
              <ConfDetailRow
                icon="📍"
                label="Location"
                value={tenant.name}
                sub={`${tenant.address} →`}
                subHref={mapsHref}
              />
              <ConfDetailRow
                icon="💳"
                label={offlinePending ? 'Amount due' : 'Amount paid'}
                value={formatPrice(booking.totalAmount)}
                sub={offlinePending ? 'Pay at venue' : undefined}
              />
            </div>

            <Button variant="secondary" size="lg" fullWidth asChild>
              <a
                href={`/api/bookings/${booking.confirmationCode}/ics?email=${encodeURIComponent(booking.customerEmail)}`}
                download
              >
                Add to calendar
              </a>
            </Button>

            {showAccountPrompt ? (
              accountExpanded ? (
                <div className="rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-action)] bg-[var(--color-action-tint)] px-4 py-3.5">
                  <p
                    className="text-[15px] text-[var(--color-action-text)] [font-family:var(--font-display)]"
                  >
                    Manage your booking
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-action-text)]">
                    Create a free account to cancel or reschedule without
                    calling us.
                  </p>
                  <label className="mt-3 flex flex-col gap-1">
                    <span className="text-xs text-[var(--color-action-text)]">
                      Password (8+ characters)
                    </span>
                    <Input
                      type="password"
                      value={claimPassword}
                      onChange={(e) => setClaimPassword(e.target.value)}
                    />
                  </label>
                  {claimError ? (
                    <p className="mt-2 text-xs text-[var(--status-error-text)]">
                      {claimError}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-[2]"
                      loading={claimPending}
                      onClick={() => void handleCreateAccount()}
                    >
                      Create account
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 border border-[var(--color-action)] text-[var(--color-action-text)]"
                      onClick={() => setAccountExpanded(false)}
                    >
                      Maybe later
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-[var(--radius-lg)] border-[1.5px] border-[var(--color-border)] bg-[var(--surface-card)] px-[15px] py-3">
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Want to manage this booking?
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--color-action)]"
                    onClick={() => setAccountExpanded(true)}
                  >
                    Create account →
                  </button>
                </div>
              )
            ) : null}

            <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] px-3.5 py-3">
              <span className="text-base" aria-hidden>
                📞
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Need to make changes?
                </p>
                <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  <a href={telHref} className="font-medium underline">
                    {tenant.phone}
                  </a>
                </p>
              </div>
            </div>

            <Button size="lg" fullWidth onClick={() => router.push('/')}>
              Done
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
    </div>
  )
}
