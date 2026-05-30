'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { BookingFlowHeader } from '@/components/patterns/booking-flow-header'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { StepIndicator } from '@/components/patterns/step-indicator'
import { HoldTimer } from '@/components/patterns/hold-timer'
import { OrderSummaryCard } from '@/components/patterns/order-summary-card'
import {
  PaymentErrorBanner,
  PaymentProcessingOverlay,
} from '@/components/patterns/payment-checkout-chrome'
import { PaymentPriceFooter } from '@/components/patterns/payment-price-footer'
import { PromoInput } from '@/components/patterns/promo-input'
import { useToast } from '@/app/(customer)/book/toast-provider'
import { useBooking } from '@/context/BookingContext'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { STAFF_SIGN_IN_PATH } from '@/lib/auth-paths'
import { confirmBooking } from '@/lib/actions/booking'
import { BOOKING_BACK_BY_STEP } from '@/lib/booking-flow-nav'
import { paymentFooterLineItems } from '@/lib/booking-display'
import { isContactComplete } from '@/lib/customer-name'
import { calculateBookingTotal, formatPrice } from '@/lib/pricing'
import { useHoldExpiry } from '@/lib/use-hold-expiry'
import { useWallClockNow } from '@/lib/use-wall-clock'

import {
  BOOKING_PAYMENT_FORM_ID,
  PaymentForm,
} from './payment-form'

function shoesComplete(
  bowlerCount: number,
  selections: { size: string }[],
  shoesIncluded: boolean,
): boolean {
  if (shoesIncluded) return true
  return (
    selections.length === bowlerCount &&
    selections.every((row) => row.size.length > 0)
  )
}

export default function ConfirmBookingPage() {
  const {
    session,
    setPaymentIntent,
    clearPaymentIntent,
    applyPromoCode,
    clearPromoCode,
    setTimeSlot,
  } = useBooking()
  const tenant = useTenant()
  const router = useRouter()
  const { showToast } = useToast()
  const initStarted = useRef(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [initializingPayment, setInitializingPayment] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [promoDraft, setPromoDraft] = useState('')
  const [promoError, setPromoError] = useState<string | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const nowMs = useWallClockNow()

  const shoesIncluded = session.selectedPackage?.shoesIncluded ?? false

  const canRender =
    session.bowlerCount != null &&
    session.startTime != null &&
    session.endTime != null &&
    session.totalAmount != null &&
    session.holdId != null &&
    isContactComplete(session.customerName, session.customerEmail) &&
    shoesComplete(
      session.bowlerCount,
      session.shoeSelections,
      shoesIncluded,
    )

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

  const displayLineItems = useMemo(
    () => paymentFooterLineItems(pricing.lineItems, shoesIncluded),
    [pricing.lineItems, shoesIncluded],
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

  const holdValid =
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > nowMs

  const hasPaymentIntent = session.stripeClientSecret != null
  const checkoutLocked = initializingPayment || paymentProcessing

  const clearHold = useCallback(() => {
    setTimeSlot(null, null)
  }, [setTimeSlot])

  const handleHoldExpired = useHoldExpiry(clearHold)

  const startPayment = useCallback(async () => {
    if (!holdValid) return
    setInitializingPayment(true)
    setPaymentError(null)
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
        selectedOptionalAddonIds: session.selectedOptionalAddonIds,
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
      setInitializingPayment(false)
    }
  }, [
    holdValid,
    tenant.id,
    tenant.shoeRentalPriceCents,
    tenant.laneReservationCentsPerLane,
    session.holdId,
    session.packageId,
    session.partyType,
    session.bowlerCount,
    session.laneCount,
    session.startTime,
    session.endTime,
    session.totalAmount,
    session.promoCode,
    session.customerName,
    session.customerEmail,
    session.customerPhone,
    session.shoeSelections,
    session.selectedOptionalAddonIds,
    setPaymentIntent,
    showToast,
  ])

  useEffect(() => {
    if (!canRender || hasPaymentIntent || initStarted.current) return
    initStarted.current = true
    void startPayment()
  }, [canRender, hasPaymentIntent, startPayment])

  async function handleApplyPromo() {
    setPromoError(null)
    setPromoLoading(true)
    try {
      await applyPromoCode(promoDraft)
      setPromoDraft('')
      initStarted.current = false
      clearPaymentIntent()
    } catch (err) {
      setPromoError(
        err instanceof Error ? err.message : 'Could not apply promo code',
      )
    } finally {
      setPromoLoading(false)
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

  const payCtaLabel = paymentError
    ? 'Try again'
    : `Pay ${formatPrice(finalTotalCents)}`

  if (!canRender) {
    return null
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-8 pt-6">
      <div className={checkoutLocked ? 'pointer-events-none opacity-40' : ''}>
        <BookingFlowHeader
          venueName={tenant.name}
          address={tenant.address}
          onSignIn={() => {
            router.push(STAFF_SIGN_IN_PATH)
          }}
        />
        <StepIndicator currentStep={4} className="mt-4" />
        <HoldTimer
          expiresAt={session.holdExpiresAt}
          onExpire={handleHoldExpired}
          className="mt-4"
        />

        <BookingFlowLead
          title="Payment"
          subtitle="Almost there — review and pay"
          className="mt-4"
        />

        {paymentError ? (
          <PaymentErrorBanner
            message={`${paymentError} Your lanes are still held.`}
          />
        ) : null}

        <OrderSummaryCard
          className="mt-2"
          totalCents={finalTotalCents}
          lineItems={displayLineItems}
          promoLine={promoLine}
          expanded={summaryExpanded}
          onExpandedChange={setSummaryExpanded}
          expandedFooter={
            summaryExpanded && !session.promoCode ? (
              <div className="pt-3">
                <PromoInput
                  value={promoDraft}
                  onChange={setPromoDraft}
                  onApply={() => void handleApplyPromo()}
                  onClear={clearPromoCode}
                  appliedCode={null}
                  discountCents={null}
                  error={promoError}
                  loading={promoLoading}
                  disabled={!holdValid || checkoutLocked}
                  placeholder="Have a promo code?"
                />
              </div>
            ) : null
          }
        />

        {hasPaymentIntent ? (
          <div className="mt-4">
            <PaymentForm
              clientSecret={session.stripeClientSecret!}
              amountCents={finalTotalCents}
              returnUrl={returnUrl}
              onMockConfirm={handleMockConfirm}
              onSubmittingChange={setPaymentProcessing}
              onError={setPaymentError}
              errored={paymentError != null}
            />
          </div>
        ) : initializingPayment ? (
          <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
            Preparing secure checkout…
          </p>
        ) : null}
      </div>

      {hasPaymentIntent ? (
        <PaymentPriceFooter
          className="mt-auto"
          lineItems={displayLineItems}
          promoLine={promoLine}
          totalCents={finalTotalCents}
          ctaLabel={payCtaLabel}
          onPay={() => {}}
          formId={BOOKING_PAYMENT_FORM_ID}
          backHref={BOOKING_BACK_BY_STEP[4].href}
          backLabel={BOOKING_BACK_BY_STEP[4].label}
          backDisabled={checkoutLocked}
          ctaDisabled={!holdValid || checkoutLocked}
          ctaLoading={paymentProcessing}
        />
      ) : null}

      {checkoutLocked ? (
        <PaymentProcessingOverlay
          message={
            initializingPayment
              ? 'Preparing checkout…'
              : 'Processing your payment…'
          }
        />
      ) : null}
    </main>
  )
}
