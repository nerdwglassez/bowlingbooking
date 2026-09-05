'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { BookingFlowShell } from '@/components/patterns/booking-flow-shell'
import { OrderSummaryCard } from '@/components/patterns/order-summary-card'
import {
  PaymentErrorBanner,
  PaymentProcessingOverlay,
} from '@/components/patterns/payment-checkout-chrome'
import { PaymentPriceFooter } from '@/components/patterns/payment-price-footer'
import { PromoInput } from '@/components/patterns/promo-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/app/(customer)/book/toast-provider'
import { useBooking } from '@/context/BookingContext'
import {
  useLanePricingContext,
  useTenant,
} from '@/app/(customer)/book/tenant-provider'
import { CHECKOUT_SIGN_IN_PATH } from '@/lib/auth-paths'
import { BOOKING_BACK_BY_STEP } from '@/lib/booking-flow-nav'
import {
  confirmBooking,
  confirmOfflineBooking,
  getPackagesForTenant,
  validatePackageAccessCode,
} from '@/lib/actions/booking'
import { paymentFooterLineItems } from '@/lib/booking-display'
import { isContactComplete } from '@/lib/customer-name'
import { calculateBookingTotal, calculatePackageStepTotal, formatPrice } from '@/lib/pricing'
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
    resetSession,
    setPackage,
    setPackageAccessCode,
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
  const [smsReminderConsent, setSmsReminderConsent] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [accessCodeDraft, setAccessCodeDraft] = useState(
    () => session.packageAccessCode ?? '',
  )
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null)
  const [accessCodeLoading, setAccessCodeLoading] = useState(false)
  const nowMs = useWallClockNow()

  const needsAccessCode = session.selectedPackage?.accessType === 'CODE_REQUIRED'
  const accessCodeApplied = Boolean(session.packageAccessCode?.trim())
  const [specialCodeOpen, setSpecialCodeOpen] = useState(
    () => needsAccessCode && !accessCodeApplied,
  )
  const showSpecialCodeField =
    specialCodeOpen || needsAccessCode || accessCodeApplied
  const showLegacyPromo =
    !needsAccessCode && tenant.hasLegacyPromoCodes && !session.promoCode

  const shoesIncluded = session.selectedPackage?.shoesIncluded ?? false
  const isOfflinePackage =
    session.selectedPackage?.paymentMode === 'PAYMENT_OFFLINE'

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
  const pricingContext = useLanePricingContext({
    bowlerCount: session.bowlerCount ?? 1,
    laneCount: session.laneCount ?? 1,
    startTime: session.startTime,
    endTime: session.endTime,
  })

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
        pricingContext:
          session.selectedPackage == null ? pricingContext : undefined,
      }),
    [
      session.selectedPackage,
      session.bowlerCount,
      session.laneCount,
      session.shoeSelections,
      session.selectedOptionalAddonIds,
      tenant.shoeRentalPriceCents,
      laneReservationCents,
      pricingContext,
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

  const accessCodeReady =
    !needsAccessCode || Boolean(session.packageAccessCode?.trim())

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
      if (isOfflinePackage) {
        const result = await confirmOfflineBooking({
          tenantId: tenant.id,
          holdId: session.holdId!,
          packageId: session.packageId,
          partyType: session.partyType ?? 'OPEN',
          bowlerCount: session.bowlerCount!,
          laneCount: session.laneCount ?? 1,
          startTime: session.startTime!,
          endTime: session.endTime!,
          totalAmount: session.totalAmount!,
          customerName: session.customerName,
          customerEmail: session.customerEmail,
          customerPhone: session.customerPhone,
          shoeSelections: session.shoeSelections,
          selectedOptionalAddonIds: session.selectedOptionalAddonIds,
          smsReminderConsent,
          marketingConsent,
          packageAccessCode: needsAccessCode
            ? accessCodeDraft.trim() || session.packageAccessCode
            : null,
        })
        resetSession()
        const code = result.confirmationCode ?? 'PENDING'
        router.push(
          `/book/success?code=${encodeURIComponent(code)}&email=${encodeURIComponent(session.customerEmail)}&pending=1`,
        )
        return
      }
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
        selectedOptionalAddonIds: session.selectedOptionalAddonIds,
        smsReminderConsent,
        marketingConsent,
        packageAccessCode: needsAccessCode
          ? accessCodeDraft.trim() || session.packageAccessCode
          : null,
      })
      if (!result.clientSecret || !result.paymentIntentId) {
        throw new Error('Payment could not be started.')
      }
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
    smsReminderConsent,
    marketingConsent,
    isOfflinePackage,
    needsAccessCode,
    accessCodeDraft,
    session.packageAccessCode,
    resetSession,
    router,
    setPaymentIntent,
    showToast,
  ])

  useEffect(() => {
    if (!canRender || initStarted.current) return
    if (!accessCodeReady) return
    if (!isOfflinePackage && hasPaymentIntent) return
    initStarted.current = true
    queueMicrotask(() => {
      void startPayment()
    })
  }, [canRender, accessCodeReady, hasPaymentIntent, isOfflinePackage, startPayment])

  async function handleApplyAccessCode() {
    const code = accessCodeDraft.trim()
    if (!code) return
    setAccessCodeError(null)
    setAccessCodeLoading(true)
    try {
      const match = await validatePackageAccessCode(tenant.id, code)
      if (!match) {
        setAccessCodeError('Code not recognized.')
        return
      }
      if (
        needsAccessCode &&
        session.selectedPackage != null &&
        match.packageId !== session.selectedPackage.id
      ) {
        setAccessCodeError('Code not valid for this package.')
        return
      }
      const packages = await getPackagesForTenant(tenant.id)
      const pkg = packages.find((row) => row.id === match.packageId)
      if (!pkg) {
        setAccessCodeError('Package not available.')
        return
      }
      if (session.packageId !== pkg.id) {
        const total = calculatePackageStepTotal({
          package: pkg,
          bowlerCount: session.bowlerCount!,
          selectedOptionalAddonIds: [],
        }).totalAmount
        setPackage(pkg, total)
      }
      setPackageAccessCode(code)
      initStarted.current = false
      clearPaymentIntent()
    } finally {
      setAccessCodeLoading(false)
    }
  }

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
    <div className="relative">
      <BookingFlowShell
        venueName={tenant.name}
        address={tenant.address}
        signInHref={CHECKOUT_SIGN_IN_PATH}
        showSignIn
        currentStep={4}
        holdExpiresAt={session.holdExpiresAt}
        onHoldExpire={handleHoldExpired}
        footer={
          hasPaymentIntent ? (
            <PaymentPriceFooter
              ctaLabel={payCtaLabel}
              onPay={() => {}}
              formId={BOOKING_PAYMENT_FORM_ID}
              ctaDisabled={!holdValid || checkoutLocked}
              ctaLoading={paymentProcessing}
              back={BOOKING_BACK_BY_STEP[4]}
            />
          ) : null
        }
      >
        <div className={checkoutLocked ? 'pointer-events-none opacity-40' : ''}>
          <BookingFlowLead
            title={isOfflinePackage ? 'Review & confirm' : 'Payment'}
            subtitle={
              isOfflinePackage
                ? 'Confirm your reservation — pay at the venue'
                : 'Almost there — review and pay'
            }
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
              summaryExpanded && showLegacyPromo ? (
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

          <section className="mt-4 flex flex-col gap-2">
            {!showSpecialCodeField ? (
              <button
                type="button"
                className="w-fit border-0 bg-transparent p-0 text-xs font-semibold text-[var(--color-action)]"
                onClick={() => setSpecialCodeOpen(true)}
              >
                Have a special code?
              </button>
            ) : (
              <>
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
                  Special access code
                </h2>
                {accessCodeApplied ? (
                  <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-card)] px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {session.packageAccessCode!.toUpperCase()}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {needsAccessCode
                          ? `Verified for ${session.selectedPackage?.name}`
                          : `Applied — ${session.selectedPackage?.name ?? 'package updated'}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={checkoutLocked}
                      onClick={() => {
                        setPackageAccessCode(null)
                        setAccessCodeDraft('')
                        initStarted.current = false
                        clearPaymentIntent()
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    {needsAccessCode ? (
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Enter your code to complete checkout for{' '}
                        {session.selectedPackage?.name}.
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={accessCodeDraft}
                        onChange={(e) => {
                          setAccessCodeDraft(e.target.value)
                          setAccessCodeError(null)
                        }}
                        placeholder="Enter special code"
                        disabled={checkoutLocked}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={checkoutLocked || !accessCodeDraft.trim()}
                        loading={accessCodeLoading}
                        onClick={() => void handleApplyAccessCode()}
                      >
                        Apply
                      </Button>
                    </div>
                  </>
                )}
                {accessCodeError ? (
                  <p className="text-xs text-[var(--status-error-text)]">
                    {accessCodeError}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Checkbox
              checked={smsReminderConsent}
              onChange={(e) => setSmsReminderConsent(e.target.checked)}
              label="Send me a text reminder before my booking"
            />
            <Checkbox
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              label={`Send me promotions and news from ${tenant.name}`}
            />
          </div>

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
          ) : needsAccessCode && !accessCodeReady ? (
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
              Apply your special access code above to continue to payment.
            </p>
          ) : null}
        </div>
      </BookingFlowShell>

      {checkoutLocked ? (
        <PaymentProcessingOverlay
          message={
            initializingPayment
              ? 'Preparing checkout…'
              : 'Processing your payment…'
          }
        />
      ) : null}
    </div>
  )
}
