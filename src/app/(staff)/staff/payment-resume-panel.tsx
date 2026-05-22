'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
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
    <Card>
      <CardBody className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            Resend payment link
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            For customers who abandoned checkout or need to retry 3D Secure. Paste
            the Payment Intent id from the Stripe Dashboard (
            <code className="text-[var(--color-text-primary)]">pi_…</code>).
          </p>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[var(--color-text-secondary)]">
            Payment Intent id
          </span>
          <Input
            type="text"
            value={paymentIntentId}
            onChange={(e) => setPaymentIntentId(e.target.value)}
            placeholder="pi_3P…"
            autoComplete="off"
          />
        </label>
        {error ? (
          <p className="text-[var(--status-error-text)]">{error}</p>
        ) : null}
        {meta ? (
          <p className="text-[var(--color-text-secondary)]">{meta}</p>
        ) : null}
        {generatedUrl ? (
          <p className="break-all rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--surface-sunken)] p-3 text-[var(--color-text-primary)]">
            {generatedUrl}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleGenerate}
            loading={pending}
            disabled={!paymentIntentId.trim()}
          >
            Generate link
          </Button>
          {generatedUrl ? (
            <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
              Copy link
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  )
}
