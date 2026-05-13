'use client'

// CancelPanel — customer-facing cancel affordance. Two-stage:
//   1. "Cancel booking" button reveals an inline confirm form.
//   2. Confirm dispatches cancelBookingAction; redirects to ?cancelled=1.
//
// Refund eligibility was already computed server-side and passed in.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { cancelBookingAction } from '@/lib/actions/customer'
import { formatPrice } from '@/lib/pricing'

interface CancelPanelProps {
  email: string
  confirmationCode: string
  refundIfCancelled: number
  policyWindowHours: number
  policyRefundPercent: number
}

export function CancelPanel({
  email,
  confirmationCode,
  refundIfCancelled,
  policyWindowHours,
  policyRefundPercent,
}: CancelPanelProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      try {
        await cancelBookingAction({ email, confirmationCode })
        router.replace(
          `/find-my-booking/${confirmationCode}?email=${encodeURIComponent(email)}&cancelled=1`,
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not cancel booking.',
        )
      }
    })
  }

  const refundLine =
    refundIfCancelled > 0
      ? `You'll receive a ${formatPrice(refundIfCancelled)} refund (3–5 business days).`
      : `Cancellation is outside the ${policyWindowHours}h window, so no refund will be issued.`

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 text-sm">
        <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Cancel this booking
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Free cancellation up to <strong>{policyWindowHours}h</strong> before
          your booking ({policyRefundPercent}% refund). After that, no refund.
        </p>
        {!confirming ? (
          <div className="flex justify-end">
            <Button
              variant="danger"
              onClick={() => setConfirming(true)}
            >
              Cancel booking
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[var(--color-text-primary)]">
              Are you sure? {refundLine}
            </p>
            {error ? (
              <p className="text-[var(--status-error-text)]">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Keep booking
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={submitting}
                onClick={handleCancel}
              >
                Yes, cancel
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
