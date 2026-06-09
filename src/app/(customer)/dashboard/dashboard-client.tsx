'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Clock, MapPin, Users } from 'lucide-react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { useToast } from '@/app/(customer)/book/toast-provider'
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

const MODIFY_UNTIL_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

function formatDurationHours(start: Date, end: Date): string {
  const hours = Math.round((end.getTime() - start.getTime()) / 3_600_000)
  if (hours <= 0) return ''
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

function modifyDeadline(startTime: Date, windowHours: number): Date {
  return new Date(startTime.getTime() - windowHours * 3_600_000)
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function firstName(name: string | null): string {
  const trimmed = name?.trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0] ?? 'there'
}

function isWithinCheckInWindow(
  startTime: Date,
  checkInWindowMinutes: number,
  now: Date,
): boolean {
  const windowStart = new Date(
    startTime.getTime() - checkInWindowMinutes * 60_000,
  )
  return now >= windowStart && now <= startTime
}

function cancellationDeadline(
  startTime: Date,
  policyWindowHours: number,
): Date {
  return new Date(startTime.getTime() - policyWindowHours * 3_600_000)
}

export function DashboardClient({
  bookings,
  userName,
  userEmail,
  checkInWindowMinutes,
  venueAddress,
  venuePhone,
}: {
  bookings: DashboardBookingRow[]
  userName: string | null
  userEmail: string
  checkInWindowMinutes: number
  venueAddress: string
  venuePhone: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
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
  const [rescheduledId, setRescheduledId] = useState<string | null>(null)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const greetingName = firstName(userName)

  useEffect(() => {
    const toast = searchParams.get('toast')
    if (toast === 'cancelled') {
      showToast({
        message: 'Booking cancelled · Refund on its way',
        variant: 'error',
        durationMs: 4000,
      })
      router.replace('/dashboard', { scroll: false })
    } else if (toast === 'rescheduled') {
      showToast({
        message: 'Booking rescheduled',
        variant: 'success',
        durationMs: 4000,
      })
      router.replace('/dashboard', { scroll: false })
    }
  }, [searchParams, showToast, router])

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
        setRescheduledId(rescheduleTarget.id)
        router.push('/dashboard?toast=rescheduled')
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
        router.push('/dashboard?toast=cancelled')
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not cancel booking.',
        )
      }
    })
  }

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`
  const telHref = `tel:${venuePhone.replace(/\D/g, '')}`

  return (
    <>
      <header className="mb-5 flex flex-col gap-0.5">
        <p className="text-[11px] text-[var(--color-text-muted)]">Welcome back</p>
        <h1 className="text-[26px] leading-tight [font-family:var(--font-display)] text-[var(--color-text-primary)]">
          {greetingName === 'there' ? userEmail.split('@')[0] : greetingName}
        </h1>
      </header>

      {featured ? (
        <>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Next booking
          </h2>
          <BookingCard
            row={featured}
            featured
            checkInWindowMinutes={checkInWindowMinutes}
            now={now}
            rescheduled={rescheduledId === featured.id}
            venueAddress={venueAddress}
            mapsHref={mapsHref}
            venuePhone={venuePhone}
            telHref={telHref}
            onCancel={() => setCancelTarget(featured)}
            onReschedule={() => openReschedule(featured)}
          />
        </>
      ) : (
        <Card variant="flat">
          <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              No upcoming bookings
            </p>
            <Button asChild>
              <Link href="/book">Book a lane</Link>
            </Button>
          </CardBody>
        </Card>
      )}

      {rest.length > 0 ? (
        <section className="mt-1 flex flex-col gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            Also coming up
          </h2>
          {rest.map((row) => (
            <BookingCard
              key={row.id}
              row={row}
              checkInWindowMinutes={checkInWindowMinutes}
              now={now}
              rescheduled={rescheduledId === row.id}
              venueAddress={venueAddress}
              mapsHref={mapsHref}
              venuePhone={venuePhone}
              telHref={telHref}
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
  checkInWindowMinutes = 60,
  now = new Date(),
  rescheduled = false,
  venueAddress = '',
  mapsHref = '#',
  venuePhone = '',
  telHref = '#',
  onCancel,
  onReschedule,
}: {
  row: DashboardBookingRow
  featured?: boolean
  past?: boolean
  checkInWindowMinutes?: number
  now?: Date
  rescheduled?: boolean
  venueAddress?: string
  mapsHref?: string
  venuePhone?: string
  telHref?: string
  onCancel?: () => void
  onReschedule?: () => void
}) {
  const dateLine = DATE_FORMATTER.format(row.startTime)
  const timeFormatter = TIME_FORMATTER.format(row.startTime)
  const duration = formatDurationHours(row.startTime, row.endTime)
  const timeLine = duration ? `${timeFormatter} · ${duration}` : timeFormatter
  const inCheckInWindow =
    !past &&
    isWithinCheckInWindow(row.startTime, checkInWindowMinutes, now)
  const selfServeLocked = inCheckInWindow || (!row.reschedulable && !row.cancellable)
  const modifyBy = modifyDeadline(row.startTime, row.rescheduleWindowHours)
  const showModifyBadge =
    !past &&
    !inCheckInWindow &&
    (row.reschedulable || row.cancellable) &&
    modifyBy > now
  const showNoSelfServeBadge =
    !past && !row.reschedulable && !row.cancellable
  const cancelUntil = cancellationDeadline(row.startTime, row.policyWindowHours)
  const showCancelPolicy =
    !past && !inCheckInWindow && row.cancellable && cancelUntil > now

  if (featured) {
    return (
      <article className="relative mb-5 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-dark)] p-5">
        <p className="mb-2.5 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Coming up
        </p>
        <p
          className="text-[26px] leading-tight text-[var(--color-text-inverted)] [font-family:var(--font-display)]"
        >
          {dateLine}
        </p>
        <p className="mb-3.5 mt-0.5 text-[13px] text-[var(--color-text-muted)]">
          {timeLine}
        </p>

        <div className="mb-4 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Users
              className="size-[13px] shrink-0 text-[var(--color-text-muted)]"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              {row.bowlerCount} bowlers · {row.packageName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin
              className="size-[13px] shrink-0 text-[var(--color-text-muted)]"
              strokeWidth={1.5}
              aria-hidden
            />
            <a
              href={mapsHref}
              className="text-xs text-[var(--color-action-dark)] underline underline-offset-2"
            >
              {venueAddress} →
            </a>
          </div>
        </div>

        <div className="mb-4 inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-text-inverted)_10%,transparent)] bg-[color-mix(in_srgb,var(--color-text-inverted)_6%,transparent)] px-2.5 py-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Code
          </span>
          <span
            className="text-[15px] tracking-wide text-[var(--color-text-inverted)] [font-family:var(--font-display)]"
          >
            {row.confirmationCode}
          </span>
        </div>

        {rescheduled ? (
          <Badge variant="ok" className="mb-2">
            Rescheduled
          </Badge>
        ) : null}

        {!past ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-text-inverted)_12%,transparent)] bg-[color-mix(in_srgb,var(--color-text-inverted)_8%,transparent)] px-3 py-2.5 text-xs font-semibold text-[var(--color-text-inverted)] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!row.reschedulable || selfServeLocked}
              onClick={onReschedule}
            >
              Reschedule
            </button>
            <button
              type="button"
              className="flex-1 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--status-error-text)_20%,transparent)] bg-[color-mix(in_srgb,var(--status-error-text)_10%,transparent)] px-3 py-2.5 text-xs font-semibold text-[var(--status-error-text)] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!row.cancellable || selfServeLocked}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        ) : null}

        {inCheckInWindow ? (
          <p className="mt-2 text-center text-[10px] leading-relaxed text-[var(--color-text-secondary)]">
            Changes within {row.rescheduleWindowHours} hours require calling us ·{' '}
            <a href={telHref} className="text-[var(--color-action-dark)] underline">
              {venuePhone}
            </a>
          </p>
        ) : showCancelPolicy ? (
          <p className="mt-2 text-center text-[10px] text-[var(--color-text-secondary)]">
            Free cancellation until{' '}
            {MODIFY_UNTIL_FORMATTER.format(cancelUntil)} ·{' '}
            {TIME_FORMATTER.format(cancelUntil)}
          </p>
        ) : null}
      </article>
    )
  }

  return (
    <Card variant="flat">
      <CardBody className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base [font-family:var(--font-display)] text-[var(--color-text-primary)]">
              {dateLine}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {timeLine}
            </p>
          </div>
          <span className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--surface-sunken)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--color-text-muted)]">
            {row.confirmationCode}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--surface-ground)] px-[7px] py-0.5 text-[10px] text-[var(--color-text-secondary)]">
            {row.bowlerCount} bowlers
          </span>
          <span className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--surface-ground)] px-[7px] py-0.5 text-[10px] text-[var(--color-text-secondary)]">
            {row.packageName}
          </span>
        </div>

        {showModifyBadge ? (
          <p className="inline-flex w-fit items-center gap-1 rounded-[var(--radius-full)] border border-[var(--color-action)] bg-[var(--color-action-tint)] px-[7px] py-0.5 text-[9px] font-semibold text-[var(--color-action-text)]">
            <Clock className="size-2.5" strokeWidth={2} aria-hidden />
            Modify by {MODIFY_UNTIL_FORMATTER.format(modifyBy)}
          </p>
        ) : null}

        {showNoSelfServeBadge ? (
          <p className="inline-flex w-fit items-center gap-1 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-[var(--surface-sunken)] px-[7px] py-0.5 text-[9px] font-semibold text-[var(--color-text-muted)]">
            <Users className="size-2.5" strokeWidth={2} aria-hidden />
            Large group · contact venue to modify
          </p>
        ) : null}

        {rescheduled ? <Badge variant="ok">Rescheduled</Badge> : null}

        {!past ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--surface-sunken)] px-2.5 py-2 text-[11px] font-semibold text-[var(--color-text-secondary)] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!row.reschedulable || selfServeLocked}
              onClick={onReschedule}
            >
              Reschedule
            </button>
            <button
              type="button"
              className="flex-1 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--status-error-text)_20%,transparent)] bg-[var(--status-error-bg)] px-2.5 py-2 text-[11px] font-semibold text-[var(--status-error-text)] disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!row.cancellable || selfServeLocked}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}
