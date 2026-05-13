'use client'

import { useMemo, useState } from 'react'
import { redirect, useRouter } from 'next/navigation'

import { VenueHeader } from '@/components/patterns/venue-header'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { BookingSummaryCard } from '@/components/patterns/booking-summary-card'
import { PriceFooter } from '@/components/patterns/price-footer'
import { Input } from '@/components/ui/input'
import { useBooking } from '@/context/BookingContext'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { confirmBooking } from '@/lib/actions/booking'
import { calculatePrice } from '@/lib/pricing'
import { useWallClockNow } from '@/lib/use-wall-clock'

import { PaymentForm } from './payment-form'

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

export default function ConfirmBookingPage() {
  const { session } = useBooking()
  if (
    session.packageId == null ||
    session.selectedPackage == null ||
    session.bowlerCount == null ||
    session.startTime == null ||
    session.endTime == null ||
    session.totalAmount == null ||
    session.holdId == null
  ) {
    redirect('/book/package')
  }
  return <ConfirmBookingContent />
}

function ConfirmBookingContent() {
  const { session, setCustomerInfo, setPaymentIntent } = useBooking()
  const tenant = useTenant()
  const router = useRouter()
  const [emailTouched, setEmailTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const nowMs = useWallClockNow()

  const pricing = useMemo(
    () =>
      calculatePrice({
        package: session.selectedPackage!,
        bowlerCount: session.bowlerCount!,
      }),
    [session.selectedPackage, session.bowlerCount],
  )

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    session.customerEmail,
  )
  const detailsValid =
    session.customerName.trim().length >= 2 && isEmailValid
  const holdValid =
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > nowMs

  const dateLabel = DATE_FORMATTER.format(session.startTime!)
  const timeLabel = formatTimeLabel(session.startTime!, session.endTime!)

  const hasPaymentIntent = session.stripeClientSecret != null

  function handleHoldExpired() {
    router.push('/book/time')
  }

  async function handleContinue() {
    if (!detailsValid || !holdValid) return
    setSubmitting(true)
    setPaymentError(null)
    try {
      const result = await confirmBooking({
        tenantId: tenant.id,
        holdId: session.holdId!,
        packageId: session.packageId!,
        partyType: session.partyType ?? 'OPEN',
        bowlerCount: session.bowlerCount!,
        startTime: session.startTime!,
        endTime: session.endTime!,
        totalAmount: session.totalAmount!,
        customerName: session.customerName,
        customerEmail: session.customerEmail,
        customerPhone: session.customerPhone,
      })
      setPaymentIntent(result.clientSecret, result.paymentIntentId)
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Could not start payment',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleMockConfirm() {
    router.push(
      `/book/success?payment_intent=${encodeURIComponent(session.stripePaymentIntentId!)}`,
    )
  }

  const returnUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/book/success`

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-6">
      <VenueHeader venueName={tenant.name} address={tenant.address} />
      <StepIndicator currentStep={4} />
      <HoldTimer
        expiresAt={session.holdExpiresAt}
        onExpire={handleHoldExpired}
      />

      <h1 className="text-2xl">
        {hasPaymentIntent ? 'Pay to confirm' : 'Confirm your booking'}
      </h1>

      <BookingSummaryCard
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        bowlerCount={session.bowlerCount!}
        laneCount={session.laneCount!}
        packageName={session.selectedPackage!.name}
        totalAmount={session.totalAmount!}
      />

      {hasPaymentIntent ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            Payment
          </h2>
          <PaymentForm
            clientSecret={session.stripeClientSecret!}
            amountCents={session.totalAmount!}
            returnUrl={returnUrl}
            onMockConfirm={handleMockConfirm}
          />
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            Your details
          </h2>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Name</span>
            <Input
              type="text"
              value={session.customerName}
              onChange={(e) => setCustomerInfo({ name: e.target.value })}
              placeholder="Jane Doe"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">Email</span>
            <Input
              type="email"
              value={session.customerEmail}
              onChange={(e) => setCustomerInfo({ email: e.target.value })}
              placeholder="jane@example.com"
              invalid={emailTouched && !isEmailValid}
              onBlur={() => setEmailTouched(true)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Phone (optional)
            </span>
            <Input
              type="tel"
              value={session.customerPhone}
              onChange={(e) => setCustomerInfo({ phone: e.target.value })}
              placeholder="(555) 555-1234"
            />
          </label>
          {paymentError ? (
            <p className="text-sm text-[var(--status-error-text)]">
              {paymentError}
            </p>
          ) : null}
        </section>
      )}

      {!hasPaymentIntent ? (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
          <PriceFooter
            pricing={pricing}
            ctaLabel="Continue to payment"
            onCta={handleContinue}
            ctaDisabled={!detailsValid || !holdValid}
            ctaLoading={submitting}
          />
        </div>
      ) : null}
    </main>
  )
}
