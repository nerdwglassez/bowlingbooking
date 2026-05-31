'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  checkInBookingAction,
  markBookingCompletedAction,
  markBookingNoShowAction,
} from '@/lib/actions/staff'

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
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      }
    })
  }

  if (status === 'CANCELLED') return null

  return (
    <div className="flex flex-col gap-2">
      {error ? (
        <p className="text-sm text-[var(--status-error-text)]">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {checkedInAt == null && status === 'CONFIRMED' ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => run(() => checkInBookingAction(bookingId))}
          >
            Check in
          </Button>
        ) : null}
        {status === 'CONFIRMED' ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => markBookingNoShowAction(bookingId))}
            >
              Mark no-show
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(() => markBookingCompletedAction(bookingId))}
            >
              Mark completed
            </Button>
          </>
        ) : null}
      </div>
      {checkedInAt != null ? (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Checked in at {checkedInAt.toLocaleString()}
        </p>
      ) : null}
    </div>
  )
}
