'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useBooking } from '@/context/BookingContext'
import { signInPathForPath } from '@/lib/auth-paths'
import { useTenant } from '@/app/(customer)/book/tenant-provider'
import {
  acquireBookingHold,
  getAvailableDates,
  getAvailableDatesForMonth,
  getAvailableTimeSlots,
  releaseBookingHold,
  type AvailableDate,
} from '@/lib/actions/booking'
import { BookingCalendar } from '@/components/patterns/booking-calendar'
import { BookingFlowLead } from '@/components/patterns/booking-flow-lead'
import { BookingFlowShell } from '@/components/patterns/booking-flow-shell'
import { BowlerCounter } from '@/components/patterns/bowler-counter'
import { DateStrip } from '@/components/patterns/date-strip'
import { GroupSizeBanner } from '@/components/patterns/group-size-banner'
import { TimeSlotGrid } from '@/components/patterns/time-slot-grid'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatBowlersLanesDateSummary } from '@/lib/booking-display'
import { useHoldExpiry } from '@/lib/use-hold-expiry'
import { useWallClockNow } from '@/lib/use-wall-clock'
import type { TimeSlot } from '@/types'

const WEEK_STRIP_DAYS = 7

function initialCalendarMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

function calendarMonthForDate(dateIso: string | null): {
  year: number
  month: number
} {
  if (dateIso == null) return initialCalendarMonth()
  const d = new Date(`${dateIso}T12:00:00`)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function WeekStripSkeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" aria-busy aria-hidden>
      {Array.from({ length: WEEK_STRIP_DAYS + 1 }, (_, i) => (
        <Skeleton key={i} className="h-[3.75rem] w-14 shrink-0" />
      ))}
    </div>
  )
}

export default function BookStepOnePage() {
  const router = useRouter()
  const pathname = usePathname()
  const tenant = useTenant()
  const { session, setBowlerCount, setDate, setTimeSlot } = useBooking()
  const [{ year, month }, setCalendarMonth] = useState(initialCalendarMonth)
  const [weekDates, setWeekDates] = useState<AvailableDate[]>([])
  const [weekPending, setWeekPending] = useState(true)
  const [monthDates, setMonthDates] = useState<AvailableDate[]>([])
  const [monthPending, setMonthPending] = useState(true)
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(false)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsPending, setSlotsPending] = useState(false)

  const bowlerCount = session.bowlerCount ?? 1
  const maxOnlineBowlers = tenant.maxOnlineBowlers

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await getAvailableDates(
          tenant.id,
          WEEK_STRIP_DAYS,
          bowlerCount,
        )
        if (!cancelled) setWeekDates(next)
      } finally {
        if (!cancelled) setWeekPending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant.id, bowlerCount])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const next = await getAvailableDatesForMonth(
          tenant.id,
          year,
          month,
          bowlerCount,
        )
        if (!cancelled) setMonthDates(next)
      } finally {
        if (!cancelled) setMonthPending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant.id, year, month, bowlerCount])

  useEffect(() => {
    const date = session.date
    if (date == null || session.bowlerCount == null) {
      const clearId = window.setTimeout(() => {
        setSlots([])
        setSlotsPending(false)
      }, 0)
      return () => {
        window.clearTimeout(clearId)
      }
    }
    let cancelled = false
    void (async () => {
      if (!cancelled) {
        setSlotsPending(true)
        setSlots([])
      }
      try {
        const next = await getAvailableTimeSlots(
          tenant.id,
          date,
          session.bowlerCount!,
        )
        if (!cancelled) setSlots(next)
      } finally {
        if (!cancelled) setSlotsPending(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant.id, session.date, session.bowlerCount])

  const previousHoldIdRef = useRef<string | null>(null)
  useEffect(() => {
    previousHoldIdRef.current = session.holdId
  }, [session.holdId])

  const handleSlotSelect = useCallback(
    async (slot: TimeSlot) => {
      if (session.bowlerCount == null) return
      const oldHoldId = previousHoldIdRef.current
      const { holdId, expiresAt } = await acquireBookingHold({
        tenantId: tenant.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        bowlerCount: session.bowlerCount,
      })
      setTimeSlot(slot, { id: holdId, expiresAt })
      if (oldHoldId && oldHoldId !== holdId) {
        void releaseBookingHold(oldHoldId)
      }
    },
    [session.bowlerCount, setTimeSlot, tenant.id],
  )

  const wallNow = useWallClockNow()

  const clearHold = useCallback(() => {
    setTimeSlot(null, null)
  }, [setTimeSlot])

  const handleHoldExpired = useHoldExpiry(clearHold)

  const leadSubtitle =
    session.bowlerCount != null && session.date != null
      ? formatBowlersLanesDateSummary(session.bowlerCount, session.date)
      : 'How many people, and when?'

  const canProceedToPackages =
    session.timeSlotId != null &&
    session.holdExpiresAt != null &&
    session.holdExpiresAt.getTime() > wallNow

  const ctaLabel = canProceedToPackages
    ? 'Continue to packages →'
    : 'Select a date and time to continue'

  function handleOpenMobileCalendar() {
    setCalendarMonth(calendarMonthForDate(session.date))
    setMobileCalendarOpen(true)
  }

  function handleDateSelect(date: string) {
    setDate(date)
    const picked = calendarMonthForDate(date)
    setCalendarMonth(picked)
  }

  function handleNext() {
    if (!canProceedToPackages) return
    router.push('/book/package')
  }

  return (
    <BookingFlowShell
      venueName={tenant.name}
      address={tenant.address}
      signInHref={signInPathForPath(pathname)}
      currentStep={1}
      holdExpiresAt={session.holdExpiresAt}
      onHoldExpire={handleHoldExpired}
    >
      <BookingFlowLead
        title="Let's get you bowling"
        subtitle={leadSubtitle}
      />
      <section className="flex flex-col gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Bowlers in your group
        </h2>
        <BowlerCounter
          value={bowlerCount}
          max={maxOnlineBowlers}
          onChange={setBowlerCount}
        />
        {bowlerCount >= maxOnlineBowlers ? (
          <GroupSizeBanner phone={tenant.phone} maxBowlers={maxOnlineBowlers} />
        ) : null}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Pick a date
        </h2>

        {/* Mobile: week strip, optional expand to full calendar */}
        <div className="md:hidden">
          {!mobileCalendarOpen ? (
            weekPending ? (
              <WeekStripSkeleton />
            ) : (
              <DateStrip
                dates={weekDates}
                selectedDate={session.date}
                onSelect={handleDateSelect}
                onOpenCalendar={handleOpenMobileCalendar}
              />
            )
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit px-2"
                onClick={() => setMobileCalendarOpen(false)}
              >
                ← This week
              </Button>
              <BookingCalendar
                year={year}
                month={month}
                dates={monthDates}
                selectedDate={session.date}
                loading={monthPending}
                onSelect={handleDateSelect}
                onMonthChange={(y, m) => setCalendarMonth({ year: y, month: m })}
              />
            </div>
          )}
        </div>

        {/* md+: full calendar */}
        <div className="hidden md:block">
          <BookingCalendar
            year={year}
            month={month}
            dates={monthDates}
            selectedDate={session.date}
            loading={monthPending}
            onSelect={handleDateSelect}
            onMonthChange={(y, m) => setCalendarMonth({ year: y, month: m })}
          />
        </div>
      </section>

      <section
        className={[
          'flex flex-col gap-2',
          session.date == null ? 'pointer-events-none opacity-35' : '',
        ].join(' ')}
      >
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Choose a time
        </h2>
        {session.date == null ? (
          <p className="py-4 text-center text-[11px] text-[var(--color-text-muted)]">
            Select a date to see available times
          </p>
        ) : (
          <TimeSlotGrid
            slots={slots}
            selectedSlotId={session.timeSlotId}
            loading={slotsPending}
            onSelect={handleSlotSelect}
          />
        )}
      </section>

      <Button
        variant="primary"
        fullWidth
        className="mt-auto"
        onClick={handleNext}
        disabled={!canProceedToPackages}
      >
        {ctaLabel}
      </Button>
    </BookingFlowShell>
  )
}
