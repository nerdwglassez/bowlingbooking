'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/base/buttons/button'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { formatPrice } from '@/lib/pricing'
import {
  manualRefundBookingAction,
  refundBookingAction,
} from '@/lib/actions/refund'
import { runStaffAction } from '@/lib/refresh-after-action'

interface RefundPanelProps {
  bookingId: string
  amountCents: number
  isManual: boolean
}

const CARD =
  'rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset'

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
  const [method, setMethod] = useState<'cash' | 'check' | 'comp' | 'other'>(
    'cash',
  )
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, startTransition] = useTransition()

  if (!open) {
    return (
      <div className={`${CARD} flex flex-col gap-3 md:flex-row md:items-center md:justify-between`}>
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-primary">Manager actions</h2>
          <p className="text-sm text-tertiary">
            {isManual
              ? 'Record a manual refund for this walk-in payment.'
              : 'Issue a refund via Stripe. Webhook confirms the final status.'}
          </p>
        </div>
        <Button
          color="primary-destructive"
          onClick={() => setOpen(true)}
        >
          {isManual ? 'Manual refund' : 'Refund booking'}
        </Button>
      </div>
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
    runStaffAction({
      startTransition,
      action: async () => {
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
      },
      onSuccess: () => setOpen(false),
      onError: (err) => {
        setError(
          err instanceof Error ? err.message : 'Refund failed unexpectedly.',
        )
      },
      refresh: () => router.refresh(),
    })
  }

  return (
    <div className={CARD}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-primary">
          {isManual ? 'Manual refund (walk-in)' : 'Refund booking'}
        </h2>
        <Input
          type="number"
          label={`Amount (cents) · max ${formatPrice(amountCents)}`}
          value={amount}
          onChange={setAmount}
          hint={`Enter an amount between 1 and ${amountCents} cents.`}
          isRequired
        />
        {isManual ? (
          <NativeSelect
            label="Method"
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            options={[
              { label: 'Cash', value: 'cash' },
              { label: 'Check', value: 'check' },
              { label: 'Comp', value: 'comp' },
              { label: 'Other', value: 'other' },
            ]}
          />
        ) : (
          <NativeSelect
            label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            options={[
              { label: 'Requested by customer', value: 'requested_by_customer' },
              { label: 'Duplicate', value: 'duplicate' },
              { label: 'Fraudulent', value: 'fraudulent' },
            ]}
          />
        )}
        <Input
          label="Internal notes"
          value={notes}
          onChange={setNotes}
          placeholder="Optional — visible to staff only"
        />
        {isManual ? (
          <p className="text-sm text-tertiary">
            This records a manual refund. No Stripe API call is made.
          </p>
        ) : null}
        {error ? <p className="text-sm text-error-primary">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            color="tertiary"
            onClick={() => setOpen(false)}
            isDisabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary-destructive"
            isLoading={submitting}
          >
            {isManual ? 'Confirm manual refund' : 'Confirm refund'}
          </Button>
        </div>
      </form>
    </div>
  )
}
