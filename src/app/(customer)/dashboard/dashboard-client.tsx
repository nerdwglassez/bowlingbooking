'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { DashboardBookingRow } from '@/lib/actions/dashboard'
import {
  cancelDashboardBookingAction,
  rescheduleDashboardBookingAction,
} from '@/lib/actions/customer'
import { formatPrice } from '@/lib/pricing'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function DashboardClient({
  bookings,
  venueName,
}: {
  bookings: DashboardBookingRow[]
  venueName: string
}) {
  const router = useRouter()
  const now = useMemo(() => new Date(), [])
  const upcoming = bookings.filter(
    (b) => b.startTime > now && b.status === 'CONFIRMED',
  )
  const past = bookings.filter(
    (b) => b.startTime <= now || b.status !== 'CONFIRMED',
  )
  const featured = upcoming[0] ?? null
  const rest = upcoming.slice(1)

  const [cancelTarget, setCancelTarget] = useState<DashboardBookingRow | null>(
    null,
  )
  const [rescheduleTarget, setRescheduleTarget] =
    useState<DashboardBookingRow | null>(null)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const greeting = useMemo(() => {
    const hour = now.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [now])

  function openReschedule(row: DashboardBookingRow) {
    setDraftStart(toDatetimeLocal(row.startTime))
    setDraftEnd(toDatetimeLocal(row.endTime))
    setError(null)
    setRescheduleTarget(row)
  }

  function handleRescheduleSave() {
    if (!rescheduleTarget) return
    const start = new Date(draftStart)
    const end = new Date(draftEnd)
    setError(null)
    startTransition(async () => {
      try {
        await rescheduleDashboardBookingAction({
          bookingId: rescheduleTarget.id,
          startTime: start,
          endTime: end,
        })
        setRescheduleTarget(null)
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not reschedule booking.',
        )
      }
    })
  }

  function handleCancelConfirm() {
    if (!cancelTarget) return
    setError(null)
    startTransition(async () => {
      try {
        await cancelDashboardBookingAction(cancelTarget.id)
        setCancelTarget(null)
        router.refresh()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not cancel booking.',
        )
      }
    })
  }

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl [font-family:var(--font-display)] text-[var(--color-text-primary)]">
          {greeting}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {venueName} · your upcoming lanes
        </p>
      </header>

      {featured ? (
        <BookingCard
          row={featured}
          featured
          onCancel={() => setCancelTarget(featured)}
          onReschedule={() => openReschedule(featured)}
        />
      ) : (
        <Card variant="flat">
          <CardBody>
            <p className="text-sm text-[var(--color-text-secondary)]">
              No upcoming bookings.
            </p>
            <Button asChild className="mt-3">
              <Link href="/book">Book a lane</Link>
            </Button>
          </CardBody>
        </Card>
      )}

      {rest.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Also coming up
          </h2>
          {rest.map((row) => (
            <BookingCard
              key={row.id}
              row={row}
              onCancel={() => setCancelTarget(row)}
              onReschedule={() => openReschedule(row)}
            />
          ))}
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Past bookings
          </h2>
          {past.map((row) => (
            <BookingCard key={row.id} row={row} past />
          ))}
        </section>
      ) : null}

      <Button asChild variant="ghost">
        <Link href="/find-my-booking">Find a booking without signing in</Link>
      </Button>

      <BottomSheet
        open={cancelTarget != null}
        title="Cancel booking"
        onClose={() => setCancelTarget(null)}
      >
        <div className="flex flex-col gap-3 p-4 text-sm">
          {cancelTarget ? (
            <>
              <p>
                Cancel {cancelTarget.confirmationCode}?{' '}
                {cancelTarget.refundIfCancelled > 0
                  ? `Refund ${formatPrice(cancelTarget.refundIfCancelled)}.`
                  : 'No refund applies.'}
              </p>
              {error ? (
                <p className="text-xs text-[var(--status-error-text)]">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                fullWidth
                loading={pending}
                onClick={handleCancelConfirm}
              >
                Confirm cancellation
              </Button>
            </>
          ) : null}
        </div>
      </BottomSheet>

      <BottomSheet
        open={rescheduleTarget != null}
        title="Reschedule booking"
        onClose={() => setRescheduleTarget(null)}
      >
        <div className="flex flex-col gap-3 p-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-text-secondary)]">
              New start
            </span>
            <Input
              type="datetime-local"
              value={draftStart}
              onChange={(e) => setDraftStart(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--color-text-secondary)]">
              New end
            </span>
            <Input
              type="datetime-local"
              value={draftEnd}
              onChange={(e) => setDraftEnd(e.target.value)}
            />
          </label>
          {error ? (
            <p className="text-xs text-[var(--status-error-text)]">{error}</p>
          ) : null}
          <Button
            type="button"
            fullWidth
            loading={pending}
            onClick={handleRescheduleSave}
          >
            Save new time
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}

function BookingCard({
  row,
  featured = false,
  past = false,
  onCancel,
  onReschedule,
}: {
  row: DashboardBookingRow
  featured?: boolean
  past?: boolean
  onCancel?: () => void
  onReschedule?: () => void
}) {
  const dateLine = DATE_FORMATTER.format(row.startTime)
  const timeLine = `${TIME_FORMATTER.format(row.startTime)} – ${TIME_FORMATTER.format(row.endTime)}`

  return (
    <Card variant={featured ? 'elevated' : 'flat'}>
      <CardBody className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">
              {row.packageName}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {dateLine} · {timeLine}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {row.bowlerCount} bowlers · {row.laneCount}{' '}
              {row.laneCount === 1 ? 'lane' : 'lanes'} ·{' '}
              {formatPrice(row.totalAmount)}
            </p>
          </div>
          <Badge variant={past ? 'default' : 'ok'}>
            {row.confirmationCode}
          </Badge>
        </div>
        {!past ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={!row.reschedulable}
              onClick={onReschedule}
            >
              Reschedule
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={!row.cancellable}
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
