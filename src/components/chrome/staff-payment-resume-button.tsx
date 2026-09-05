'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/base/buttons/button'
import { createPaymentResumeLink } from '@/lib/actions/payment-resume'

export function StaffPaymentResumeButton({
  paymentIntentId,
}: {
  paymentIntentId: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createPaymentResumeLink(paymentIntentId)
        setUrl(result.url)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not create payment link',
        )
      }
    })
  }

  async function handleCopy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      setError('Copy failed — select the link manually.')
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4 ring-1 ring-secondary ring-inset">
      <p className="text-sm text-tertiary">
        Payment incomplete — generate a customer link to finish checkout.
      </p>
      {error ? <p className="text-sm text-error-primary">{error}</p> : null}
      {url ? (
        <p className="break-all text-sm text-primary">{url}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          color="primary"
          isLoading={pending}
          onClick={handleGenerate}
        >
          {url ? 'Regenerate link' : 'Resend payment link'}
        </Button>
        {url ? (
          <Button
            type="button"
            size="sm"
            color="secondary"
            onClick={() => void handleCopy()}
          >
            Copy link
          </Button>
        ) : null}
      </div>
    </div>
  )
}
