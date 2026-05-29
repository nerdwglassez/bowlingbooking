'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { BookingFlowHeader } from '@/components/patterns/booking-flow-header'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { BookingSummaryCard } from '@/components/patterns/booking-summary-card'
import { PriceFooter } from '@/components/patterns/price-footer'
import { PromoInput } from '@/components/patterns/promo-input'
import { Input } from '@/components/ui/input'
import { useToast } from '@/app/(customer)/book/toast-provider'
import { useBooking } from '@/context/BookingContext'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { STAFF_SIGN_IN_PATH } from '@/lib/auth-paths'
import { confirmBooking } from '@/lib/actions/booking'
import { calculateBookingTotal } from '@/lib/pricing'
import { useHoldExpiry } from '@/lib/use-hold-expiry'
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

function shoesComplete(
  bowlerCount: number,
  selections: { size: string }[],
): boolean {
  return (
    selections.length === bowlerCount &&
    selections.every((row) => row.size.length > 0)
  )
}

export default function ConfirmBookingPage() {
  const {
    session,
    setCustomerInfo,
    setPaymentIntent,
    applyPromoCode,
    clearPromoCode,
    setTimeSlot,
  } = useBooking()
  const tenant = useTenant()
  const router = useRouter()
  const { showToast } = useToast()
  const [emailTouched, setEmailTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [promoDraft, setPromoDraft] = useState('')
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const nowMs = useWallClockNow()

  const canRender =
    session.bowlerCount != null &&
    session.startTime != null &&
    session.endTime != null &&
    session.totalAmount != null &&
    session.holdId != null &&
    shoesComplete(session.bowlerCount, session.shoeSelections)

  useEffect(() => {
    if (!canRender) router.replace('/book/details')
  }, [canRender, router])

  const laneReservationCents =
    (session.laneCount ?? 1) * tenant.laneReservationCentsPerLane

  const pricing = useMemo(
    () =>
      calculateBookingTotal({
        package: session.selectedPackage,
        bowlerCount: session.bowlerCount!,
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

  const discountCents = session.promoCode?.discountCents ?? 0
  const finalTotalCents = useMemo(() => {
    if (session.totalAmount == null) return 0
    return Math.max(0, session.totalAmount - discountCents)
  }, [session.totalAmount, discountCents])

  const promoLine = useMemo(() => {
    if (session.promoCode == null || discountCents <= 0) return null
    return { code: session.promoCode.code, discountCents }
  }, [session.promoCode, discountCents])

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
  const packageLabel =
    session.selectedPackage?.name ?? 'No package selected'

  const hasPaymentIntent = session.stripeClientSecret != null

  const clearHold = useCallback(() => {
    setTimeSlot(null, null)
  }, [setTimeSlot])

  const handleHoldExpired = useHoldExpiry(clearHold)

  async function handleApplyPromo() {
    setPromoError(null)
    setPromoLoading(true)
    try {
      await applyPromoCode(promoDraft)
      setPromoDraft('')
    } catch (err) {
      setPromoError(
        err instanceof Error ? err.message : 'Could not apply promo code',
      )
    } finally {
      setPromoLoading(false)
    }
  }

  async function handleContinue() {
    if (!detailsValid || !holdValid) return
    setSubmitting(true)
    try {
      const result = await confirmBooking({
        tenantId: tenant.id,
        holdId: session.holdId!,
        packageId: session.packageId,
        partyType: session.partyType ?? 'OPEN',
        bowlerCount: session.bowlerCount!,
        laneCount: session.laneCount ?? 1,
        startTime: session.startTime!,
        endTime: session.endTime!,
        totalAmount: session.totalAmount!,
        promoCode: session.promoCode?.code ?? null,
        customerName: session.customerName,
        customerEmail: session.customerEmail,
        customerPhone: session.customerPhone,
        shoeSelections: session.shoeSelections,
        shoeRentalPriceCents: tenant.shoeRentalPriceCents,
        laneReservationCentsPerLane: tenant.laneReservationCentsPerLane,
      })
      setPaymentIntent(result.clientSecret, result.paymentIntentId)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not start payment'
      showToast({
        message,
        variant: 'error',
        durationMs: 5000,
        dismissible: true,
      })
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

  if (!canRender) {
    return null
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-6">
      <BookingFlowHeader
        step={4}
        venueName={tenant.name}
        address={tenant.address}
        onSignIn={() => {
          router.push(STAFF_SIGN_IN_PATH)
        }}
      />
      <StepIndicator currentStep={4} />
      <HoldTimer
        expiresAt={session.holdExpiresAt}
        onExpire={handleHoldExpired}
      />

      <h1 className="text-2xl" style={{ fontFamily: 'var(--font-display)' }}>
        {hasPaymentIntent ? 'Pay to confirm' : 'Confirm your booking'}
      </h1>

      <BookingSummaryCard
        dateLabel={dateLabel}
        timeLabel={timeLabel}
        bowlerCount={session.bowlerCount!}
        laneCount={session.laneCount!}
        packageName={packageLabel}
        totalAmount={finalTotalCents}
        lineItems={pricing.lineItems}
      />

      {hasPaymentIntent ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            Payment
          </h2>
          <PaymentForm
            clientSecret={session.stripeClientSecret!}
            amountCents={finalTotalCents}
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
        </section>
      )}

      {!hasPaymentIntent ? (
        <PromoInput
          value={promoDraft}
          onChange={setPromoDraft}
          onApply={() => void handleApplyPromo()}
          onClear={clearPromoCode}
          appliedCode={session.promoCode?.code ?? null}
          discountCents={
            session.promoCode != null && discountCents > 0
              ? discountCents
              : null
          }
          error={promoError}
          loading={promoLoading}
          disabled={!holdValid}
          placeholder="Have a promo code?"
        />
      ) : null}

      {!hasPaymentIntent ? (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md p-4">
          <PriceFooter
            pricing={pricing}
            ctaLabel={submitting ? 'Processing…' : 'Place booking'}
            onCta={handleContinue}
            ctaDisabled={!detailsValid || !holdValid}
            ctaLoading={submitting}
            finalTotalCents={finalTotalCents}
            promoLine={promoLine}
          />
        </div>
      ) : null}
    </main>
  )
}
