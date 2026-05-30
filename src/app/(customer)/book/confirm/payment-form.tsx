'use client'

import { useEffect, useState } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import type { PaymentIntent, Stripe, StripeElements } from '@/lib/stripe-client'

import { getStripeClient, isStripeClientMocked } from '@/lib/stripe-client'
import { formatPrice } from '@/lib/pricing'
import {
  paymentErrorMessage,
  requiresActionMessage,
} from '@/lib/payment-errors'

import { StripePaymentShell } from '@/components/patterns/payment-checkout-chrome'

export const BOOKING_PAYMENT_FORM_ID = 'booking-payment-form'

export interface PaymentFormProps {
  clientSecret: string
  amountCents: number
  /** URL Stripe redirects to after card confirmation. */
  returnUrl: string
  /**
   * Called when the form is in mock mode (no Stripe publishable key). The
   * page should navigate to the success screen with a mock PaymentIntent id.
   */
  onMockConfirm: () => void
  onSubmittingChange?: (submitting: boolean) => void
  onError?: (message: string | null) => void
  errored?: boolean
}

const ELEMENTS_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: 'var(--color-action)',
    colorText: 'var(--color-text-primary)',
    colorBackground: 'var(--surface-ground)',
    fontFamily: 'var(--font-body)',
    borderRadius: 'var(--radius-md)',
  },
}

/**
 * Stripe card fields for step 4. Submit is triggered by an external footer
 * button via `form={BOOKING_PAYMENT_FORM_ID}` (wireframe 4a).
 */
export function PaymentForm(props: PaymentFormProps) {
  if (isStripeClientMocked()) {
    return <MockPaymentForm {...props} />
  }
  return <StripePaymentFormRoot {...props} />
}

function StripePaymentFormRoot(props: PaymentFormProps) {
  const [stripePromise] = useState(() => getStripeClient())

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: props.clientSecret,
        appearance: ELEMENTS_APPEARANCE,
      }}
    >
      <PaymentFormInner {...props} />
    </Elements>
  )
}

type ConfirmOutcome =
  | { type: 'redirect' }
  | { type: 'error'; message: string }

function paymentIntentClientSecret(
  pi: PaymentIntent | string | null | undefined,
  fallback: string,
): string {
  if (pi && typeof pi === 'object' && pi.client_secret) {
    return pi.client_secret
  }
  return fallback
}

async function runHandleNextAction(
  stripe: Stripe,
  clientSecret: string,
  returnUrl: string,
): Promise<ConfirmOutcome> {
  const { error, paymentIntent } = await stripe.handleNextAction({ clientSecret })
  if (error) {
    return {
      type: 'error',
      message: paymentErrorMessage(error.code, error.message),
    }
  }
  const status = paymentIntent?.status
  if (status === 'succeeded' || status === 'processing') {
    window.location.href = returnUrl
    return { type: 'redirect' }
  }
  if (status === 'requires_action') {
    return { type: 'error', message: requiresActionMessage() }
  }
  return {
    type: 'error',
    message: status
      ? `Payment could not be completed (status: ${status}).`
      : 'Payment could not be completed. Try again.',
  }
}

async function confirmStripePayment(
  stripe: Stripe,
  elements: StripeElements | null,
  clientSecret: string,
  returnUrl: string,
): Promise<ConfirmOutcome> {
  if (!elements) {
    return { type: 'error', message: 'Payment form is still loading.' }
  }

  const result = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: returnUrl },
    redirect: 'if_required',
  })

  if (result.error) {
    const secret = paymentIntentClientSecret(
      result.error.payment_intent,
      clientSecret,
    )
    if (
      result.error.code === 'authentication_required' ||
      (typeof result.error.payment_intent === 'object' &&
        result.error.payment_intent?.status === 'requires_action')
    ) {
      return runHandleNextAction(stripe, secret, returnUrl)
    }
    return {
      type: 'error',
      message: paymentErrorMessage(result.error.code, result.error.message),
    }
  }

  const pi = result.paymentIntent
  if (!pi) {
    return { type: 'error', message: 'Payment did not return a status.' }
  }

  if (pi.status === 'requires_action') {
    return runHandleNextAction(
      stripe,
      pi.client_secret ?? clientSecret,
      returnUrl,
    )
  }

  if (pi.status === 'succeeded' || pi.status === 'processing') {
    window.location.href = returnUrl
    return { type: 'redirect' }
  }

  return {
    type: 'error',
    message: `Payment could not be completed (status: ${pi.status}).`,
  }
}

function PaymentFormInner({
  clientSecret,
  returnUrl,
  onSubmittingChange,
  onError,
  errored = false,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe) return
    onSubmittingChange?.(true)
    onError?.(null)

    const outcome = await confirmStripePayment(
      stripe,
      elements,
      clientSecret,
      returnUrl,
    )
    if (outcome.type === 'error') {
      onError?.(outcome.message)
      onSubmittingChange?.(false)
    }
  }

  return (
    <StripePaymentShell errored={errored}>
      <form
        id={BOOKING_PAYMENT_FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <PaymentElement />
      </form>
    </StripePaymentShell>
  )
}

function MockPaymentForm({
  amountCents,
  onMockConfirm,
  onSubmittingChange,
  errored = false,
}: PaymentFormProps) {
  useEffect(() => {
    console.log(
      '[payment-form] running in mock mode — NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset.',
    )
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmittingChange?.(true)
    setTimeout(onMockConfirm, 600)
  }

  return (
    <StripePaymentShell errored={errored}>
      <form
        id={BOOKING_PAYMENT_FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <div
          className="rounded-[var(--radius-md)] border-[1.5px] border-[var(--color-border)] bg-[var(--surface-ground)] px-3.5 py-3"
          role="status"
        >
          <p className="text-xs text-[var(--color-text-muted)]">
            Mock checkout — simulate {formatPrice(amountCents)}
          </p>
        </div>
      </form>
    </StripePaymentShell>
  )
}
