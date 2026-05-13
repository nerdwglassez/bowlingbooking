'use client'

import { useEffect, useState } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

import { Button } from '@/components/ui/button'
import { getStripeClient, isStripeClientMocked } from '@/lib/stripe-client'
import { formatPrice } from '@/lib/pricing'

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
}

const ELEMENTS_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: 'var(--color-action)',
    colorText: 'var(--color-text-primary)',
    colorBackground: 'var(--surface-elevated)',
    fontFamily: 'var(--font-body)',
    borderRadius: 'var(--radius-md)',
  },
}

/**
 * Wraps Stripe's <Elements> provider so the inner form can call useStripe()
 * and useElements(). In mock mode (no publishable key) renders a simulate
 * button instead — the booking flow stays clickable in design review.
 */
export function PaymentForm(props: PaymentFormProps) {
  const mocked = isStripeClientMocked()
  const [stripePromise] = useState(() => getStripeClient())

  if (mocked) {
    return <MockPaymentForm {...props} />
  }

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

function PaymentFormInner({ amountCents, returnUrl }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    })
    if (result.error) {
      setError(result.error.message ?? 'Payment failed. Try another card.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        fullWidth
        loading={submitting}
        disabled={!stripe || !elements}
      >
        Pay {formatPrice(amountCents)}
      </Button>
    </form>
  )
}

function MockPaymentForm({ amountCents, onMockConfirm }: PaymentFormProps) {
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    console.log(
      '[payment-form] running in mock mode — NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is unset.',
    )
  }, [])

  function handleSimulate() {
    setSubmitting(true)
    setTimeout(onMockConfirm, 600)
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--surface-sunken)] p-4 text-sm text-[var(--color-text-secondary)]"
        role="status"
      >
        Stripe publishable key isn&apos;t set. The card form is replaced
        with a simulate button so design review still works end-to-end.
      </div>
      <Button
        size="lg"
        fullWidth
        loading={submitting}
        onClick={handleSimulate}
      >
        Simulate payment of {formatPrice(amountCents)}
      </Button>
    </div>
  )
}
