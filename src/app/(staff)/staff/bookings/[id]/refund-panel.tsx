'use client'

// RefundPanel — client island for the booking detail page.
//
// Renders a button that opens an inline confirmation form. On submit, calls
// refundBookingAction (Stripe) or manualRefundBookingAction (walk-in) based
// on isManual. The server actions enforce MANAGER/ADMIN; this UI only hides
// the affordance for STAFF.
//
// Partial refunds: enter a smaller value (cents) than the max. The server
// clamps / validates against the collected payment amount.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardBody } from '@/components/ui/card'
import { formatPrice } from '@/lib/pricing'
import {
  manualRefundBookingAction,
  refundBookingAction,
} from '@/lib/actions/refund'

interface RefundPanelProps {
  bookingId: string
  amountCents: number
  isManual: boolean
}

export function RefundPanel({
  bookingId,
  amountCents,
  isManual,
}: RefundPanelProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(String(amountCents))
  const [reason, setReason] = useState<
    'requested_by_customer' | 'duplicate' | 'fraudulent'
  >('requested_by_customer')
  const [method, setMethod] = useState<
    'cash' | 'check' | 'comp' | 'other'
  >('cash')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  if (!open) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              Manager actions
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              {isManual
                ? 'Record a manual refund for this walk-in payment.'
                : 'Issue a refund via Stripe. Webhook confirms the final status.'}
            </p>
          </div>
          <Button variant="danger" onClick={() => setOpen(true)}>
            {isManual ? 'Manual refund' : 'Refund booking'}
          </Button>
        </CardBody>
      </Card>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const cents = Number(amount)
    if (!Number.isFinite(cents) || cents <= 0 || cents > amountCents) {
      setError(`Amount must be between 1 and ${amountCents} cents.`)
      return
    }
    startTransition(async () => {
      try {
        if (isManual) {
          await manualRefundBookingAction({
            bookingId,
            amountCents: cents,
            method,
            notes: notes || undefined,
          })
        } else {
          await refundBookingAction({
            bookingId,
            amountCents: cents,
            reason,
            notes: notes || undefined,
          })
        }
        router.refresh()
        setOpen(false)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Refund failed unexpectedly.',
        )
      }
    })
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            {isManual ? 'Manual refund (walk-in)' : 'Refund booking'}
          </h2>
          <label className="flex flex-col gap-1">
            <span className="text-[var(--color-text-secondary)]">
              Amount (cents) · max {formatPrice(amountCents)}
            </span>
            <Input
              type="number"
              min={1}
              max={amountCents}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          {isManual ? (
            <label className="flex flex-col gap-1">
              <span className="text-[var(--color-text-secondary)]">Method</span>
              <Select
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as typeof method)
                }
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="comp">Comp</option>
                <option value="other">Other</option>
              </Select>
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-[var(--color-text-secondary)]">Reason</span>
              <Select
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value as typeof reason)
                }
              >
                <option value="requested_by_customer">
                  Requested by customer
                </option>
                <option value="duplicate">Duplicate</option>
                <option value="fraudulent">Fraudulent</option>
              </Select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-[var(--color-text-secondary)]">
              Internal notes
            </span>
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — visible to staff only"
            />
          </label>
          {isManual ? (
            <p className="text-[var(--color-text-secondary)]">
              This records a manual refund. No Stripe API call is made.
            </p>
          ) : null}
          {error ? (
            <p className="text-[var(--status-error-text)]">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={submitting}>
              {isManual ? 'Confirm manual refund' : 'Confirm refund'}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
