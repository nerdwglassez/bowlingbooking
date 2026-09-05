'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { createPaymentResumeLink } from '@/lib/actions/payment-resume'
import { formatPrice } from '@/lib/pricing'

/**
 * Staff cockpit tool: generate a signed customer link to finish an uncaptured
 * Stripe PaymentIntent (M12-M2).
 */
export function PaymentResumePanel() {
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleGenerate() {
    setError(null)
    setGeneratedUrl(null)
    setMeta(null)
    startTransition(async () => {
      try {
        const result = await createPaymentResumeLink(paymentIntentId)
        setGeneratedUrl(result.url)
        setMeta(
          `${formatPrice(result.amountCents)} · status ${result.status} · expires ${result.expiresAt.toLocaleString()}`,
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not create payment link',
        )
      }
    })
  }

  async function handleCopy() {
    if (!generatedUrl) return
    try {
      await navigator.clipboard.writeText(generatedUrl)
    } catch {
      setError('Copy failed — select the link and copy manually.')
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-primary p-4 text-sm shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs uppercase tracking-wide text-tertiary">
            Resend payment link
          </h2>
          <p className="text-tertiary">
            For customers who abandoned checkout or need to retry 3D Secure. Paste
            the Payment Intent id from the Stripe Dashboard (
            <code className="text-primary">pi_…</code>).
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-tertiary">
            Payment Intent id
          </span>
          <Input
            type="text"
            value={paymentIntentId}
            onChange={setPaymentIntentId}
            placeholder="pi_3P…"
            autoComplete="off"
          />
        </label>
        {error ? (
          <p className="text-error-primary">{error}</p>
        ) : null}
        {meta ? (
          <p className="text-tertiary">{meta}</p>
        ) : null}
        {generatedUrl ? (
          <p className="break-all rounded-xl border border-secondary bg-secondary p-3 text-primary">
            {generatedUrl}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleGenerate}
            isLoading={pending}
            isDisabled={!paymentIntentId.trim()}
          >
            Generate link
          </Button>
          {generatedUrl ? (
            <Button type="button" color="secondary" onClick={() => void handleCopy()}>
              Copy link
            </Button>
          ) : null}
        </div>
    </section>
  )
}
