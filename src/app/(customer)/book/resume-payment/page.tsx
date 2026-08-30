'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { VenueHeader } from '@/components/patterns/venue-header'
import { PaymentForm } from '@/app/(customer)/book/confirm/payment-form'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import { getResumePaymentClientSecret } from '@/lib/actions/payment-resume'
import { withPaymentIntentQuery } from '@/lib/payment-success-url'

export default function ResumePaymentPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t') ?? ''
  if (!token) {
    return <ResumePaymentShell error="This payment link is missing or invalid." />
  }
  return <ResumePaymentLoader token={token} />
}

function ResumePaymentShell({
  children,
  error,
}: {
  children?: React.ReactNode
  error?: string | null
}) {
  const tenant = useTenant()
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-32 pt-6">
      <VenueHeader venueName={tenant.name} address={tenant.address} />
      <h1 className="text-2xl">Complete your payment</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Finish paying for your lane reservation. Your hold must still be active;
        if it expired, start a new booking.
      </p>
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      {children}
    </main>
  )
}

function ResumePaymentLoader({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [amountCents, setAmountCents] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const result = await getResumePaymentClientSecret(token)
        if (cancelled) return
        setClientSecret(result.clientSecret)
        setPaymentIntentId(result.paymentIntentId)
        setAmountCents(result.amountCents)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load payment session.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const returnUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/book/success`

  return (
    <ResumePaymentShell error={error}>
      {loading ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
      ) : null}
      {clientSecret && paymentIntentId ? (
        <PaymentForm
          clientSecret={clientSecret}
          amountCents={amountCents}
          returnUrl={
            returnUrl
              ? withPaymentIntentQuery(returnUrl, paymentIntentId)
              : ''
          }
          onMockConfirm={() => {
            if (typeof window !== 'undefined') {
              window.location.href = withPaymentIntentQuery(
                returnUrl,
                paymentIntentId,
              )
            }
          }}
        />
      ) : null}
    </ResumePaymentShell>
  )
}
