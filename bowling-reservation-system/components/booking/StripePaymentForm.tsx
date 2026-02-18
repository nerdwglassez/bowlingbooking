'use client'

import { useState, useEffect } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import Button from '@/components/ui/Button'

const envKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromiseEnv = envKey ? loadStripe(envKey) : null

function PaymentFormInner({
  clientSecret,
  bookingId,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  bookingId: string
  onSuccess: (paymentIntentId: string) => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/book/confirmation?bookingId=${bookingId}`,
        payment_method_data: {
          billing_details: {},
        },
      },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message || 'Payment failed')
      setLoading(false)
      return
    }

    const paymentIntentId = clientSecret.split('_secret_')[0]
    if (paymentIntentId) onSuccess(paymentIntentId)

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" isLoading={loading} disabled={!stripe || !elements}>
          Pay now
        </Button>
      </div>
    </form>
  )
}

export default function StripePaymentForm({
  clientSecret,
  bookingId,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  bookingId: string
  onSuccess: (paymentIntentId: string) => void
  onCancel: () => void
}) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(stripePromiseEnv)

  useEffect(() => {
    if (stripePromiseEnv) return
    let cancelled = false
    fetch('/api/config/stripe')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.publishableKey) return
        setStripePromise(loadStripe(data.publishableKey))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!stripePromise) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Payment is not configured. Contact support.
      </div>
    )
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentFormInner
        clientSecret={clientSecret}
        bookingId={bookingId}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}
