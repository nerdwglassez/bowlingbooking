'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/base/buttons/button'
import {
  checkInBookingAction,
  markBookingCompletedAction,
  markBookingNoShowAction,
  staffConfirmPendingPaymentAction,
} from '@/lib/actions/staff'
import { runStaffAction } from '@/lib/refresh-after-action'

export type StaffBookingOpsPanelProps = {
  bookingId: string
  status: string
  checkedInAt: Date | null
}

export function StaffBookingOpsPanel({
  bookingId,
  status,
  checkedInAt,
}: StaffBookingOpsPanelProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<void>) {
    setError(null)
    runStaffAction({
      startTransition,
      action,
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Action failed')
      },
      refresh: () => router.refresh(),
    })
  }

  if (status === 'CANCELLED') return null

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-error-primary">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {status === 'PENDING_PAYMENT' ? (
          <Button
            type="button"
            color="primary"
            size="sm"
            isDisabled={pending}
            onClick={() =>
              run(() => staffConfirmPendingPaymentAction(bookingId))
            }
          >
            Confirm payment received
          </Button>
        ) : null}
        {checkedInAt == null && status === 'CONFIRMED' ? (
          <Button
            type="button"
            color="secondary"
            size="sm"
            isDisabled={pending}
            onClick={() => run(() => checkInBookingAction(bookingId))}
          >
            Check in
          </Button>
        ) : null}
        {status === 'CONFIRMED' ? (
          <>
            <Button
              type="button"
              color="tertiary"
              size="sm"
              isDisabled={pending}
              onClick={() => run(() => markBookingNoShowAction(bookingId))}
            >
              Mark no-show
            </Button>
            <Button
              type="button"
              color="tertiary"
              size="sm"
              isDisabled={pending}
              onClick={() => run(() => markBookingCompletedAction(bookingId))}
            >
              Mark completed
            </Button>
          </>
        ) : null}
      </div>
      {checkedInAt != null ? (
        <p className="text-xs text-tertiary">
          Checked in at {checkedInAt.toLocaleString()}
        </p>
      ) : null}
    </div>
  )
}
