// Pure staff-report aggregations + tenant-timezone window helpers.
// Used by staff-reports actions; keep free of Prisma / auth side effects.

import type { StaffReportsPeriod, StaffReportsWindow } from '@/lib/reports-display'

export type BookingSourceCode = 'ONLINE' | 'WALK_IN' | 'PHONE'

export type MetricsPayment = {
  status: string
  refundAmount?: number | null
  refundStatus?: string | null
}

export type MetricsBookingRow = {
  id: string
  startTime: Date
  endTime?: Date | null
  totalAmount: number
  status: string
  source?: string | null
  laneCount?: number
  payment: MetricsPayment | null
}

export type SourceMixRow = {
  source: BookingSourceCode
  bookingCount: number
  revenueCents: number
}

export type UtilizationInputs = {
  /** Active lanes available to the venue. */
  laneCount: number
  /** Sum of open minutes across calendar days in the window (one day × open span). */
  operatingMinutesInWindow: number
  /** Sum of (laneCount × duration minutes) for paid CONFIRMED/COMPLETED bookings. */
  bookedLaneMinutes: number
  /** Sum of (blocked lane count × block duration minutes) overlapping the window. */
  blockedLaneMinutes: number
}

export type RevenueBreakdown = {
  /** Paid CONFIRMED/COMPLETED booking totals (integer cents). */
  grossRevenueCents: number
  /** Sum of Payment.refundAmount where refundStatus = SUCCEEDED. */
  refundTotalCents: number
  /** gross − refunds (floored at 0). */
  netRevenueCents: number
  bookingCount: number
  avgValueCents: number
}

const SOURCE_ORDER: BookingSourceCode[] = ['ONLINE', 'WALK_IN', 'PHONE']

export function isCapturedPayment(
  payment: MetricsPayment | null | undefined,
): boolean {
  if (!payment) return false
  return payment.status === 'succeeded' || payment.status === 'cash'
}

export function isPaidReportBooking(row: MetricsBookingRow): boolean {
  return (
    (row.status === 'CONFIRMED' || row.status === 'COMPLETED') &&
    isCapturedPayment(row.payment)
  )
}

export function computeRevenueBreakdown(
  rows: MetricsBookingRow[],
): RevenueBreakdown {
  const paid = rows.filter(isPaidReportBooking)
  const grossRevenueCents = paid.reduce((s, b) => s + b.totalAmount, 0)
  const refundTotalCents = rows.reduce((s, b) => {
    const p = b.payment
    if (!p || p.refundStatus !== 'SUCCEEDED') return s
    return s + (p.refundAmount ?? 0)
  }, 0)
  const netRevenueCents = Math.max(0, grossRevenueCents - refundTotalCents)
  const bookingCount = paid.length
  const avgValueCents =
    bookingCount > 0 ? Math.floor(grossRevenueCents / bookingCount) : 0
  return {
    grossRevenueCents,
    refundTotalCents,
    netRevenueCents,
    bookingCount,
    avgValueCents,
  }
}

export function computeSourceMix(rows: MetricsBookingRow[]): SourceMixRow[] {
  const paid = rows.filter(isPaidReportBooking)
  const map = new Map<BookingSourceCode, SourceMixRow>()
  for (const source of SOURCE_ORDER) {
    map.set(source, { source, bookingCount: 0, revenueCents: 0 })
  }
  for (const row of paid) {
    const raw = (row.source ?? 'ONLINE').toUpperCase()
    const source: BookingSourceCode =
      raw === 'WALK_IN' || raw === 'PHONE' ? raw : 'ONLINE'
    const cur = map.get(source)!
    cur.bookingCount += 1
    cur.revenueCents += row.totalAmount
  }
  return SOURCE_ORDER.map((s) => map.get(s)!)
}

export function computeNoShowRate(rows: MetricsBookingRow[]): number {
  const noShows = rows.filter((b) => b.status === 'NO_SHOW').length
  const denom =
    rows.filter((b) =>
      ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(b.status),
    ).length || 1
  return Math.round((noShows / denom) * 1000) / 10
}

function durationMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
}

/**
 * Build utilization inputs from bookings + blocked slots.
 * Callers supply laneCount and operatingMinutesInWindow from tenant hours.
 */
export function buildUtilizationInputs(args: {
  laneCount: number
  operatingMinutesInWindow: number
  bookings: MetricsBookingRow[]
  blocks: Array<{ startTime: Date; endTime: Date; lanes: number[] }>
}): UtilizationInputs {
  const paid = args.bookings.filter(isPaidReportBooking)
  let bookedLaneMinutes = 0
  for (const b of paid) {
    if (!b.endTime) continue
    const lanes = b.laneCount ?? 1
    bookedLaneMinutes += lanes * durationMinutes(b.startTime, b.endTime)
  }
  let blockedLaneMinutes = 0
  for (const block of args.blocks) {
    const laneN = block.lanes.length > 0 ? block.lanes.length : args.laneCount
    blockedLaneMinutes +=
      laneN * durationMinutes(block.startTime, block.endTime)
  }
  return {
    laneCount: args.laneCount,
    operatingMinutesInWindow: args.operatingMinutesInWindow,
    bookedLaneMinutes,
    blockedLaneMinutes,
  }
}

/** Booked lane-minutes / (lanes × operating minutes), as a 0–100 rate with 1 decimal. */
export function computeLaneUtilizationPercent(
  inputs: UtilizationInputs,
): number {
  const capacity = inputs.laneCount * inputs.operatingMinutesInWindow
  if (capacity <= 0) return 0
  return Math.round((inputs.bookedLaneMinutes / capacity) * 1000) / 10
}

// ── Tenant timezone helpers ─────────────────────────────────

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function readZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const bag: Record<string, string> = {}
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value
  }
  let hour = Number(bag.hour)
  if (hour === 24) hour = 0
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  }
}

/** Offset such that `utc + offset ≈ wall clock in timeZone` (ms). */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = readZonedParts(date, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUtc - date.getTime()
}

/** Convert a civil datetime in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  )
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone)
  const adjusted = new Date(utcGuess.getTime() - offset)
  // Second pass handles DST edge cases near transitions.
  const offset2 = getTimeZoneOffsetMs(adjusted, timeZone)
  return new Date(utcGuess.getTime() - offset2)
}

export function zonedYmd(date: Date, timeZone: string): string {
  const p = readZonedParts(date, timeZone)
  const mm = String(p.month).padStart(2, '0')
  const dd = String(p.day).padStart(2, '0')
  return `${p.year}-${mm}-${dd}`
}

export function zonedStartOfDay(date: Date, timeZone: string): Date {
  const p = readZonedParts(date, timeZone)
  return zonedLocalToUtc(p.year, p.month, p.day, 0, 0, 0, timeZone)
}

export function zonedEndOfDay(date: Date, timeZone: string): Date {
  const p = readZonedParts(date, timeZone)
  return zonedLocalToUtc(p.year, p.month, p.day, 23, 59, 59, timeZone)
}

function addCalendarDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return utc.toISOString().slice(0, 10)
}

function ymdParts(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split('-').map(Number)
  return { year, month, day }
}

function startOfZonedWeekSunday(date: Date, timeZone: string): Date {
  const start = zonedStartOfDay(date, timeZone)
  const dow = readZonedParts(start, timeZone)
  // get weekday via UTC noon of that YMD to avoid DST skew
  const ymd = zonedYmd(start, timeZone)
  const noonUtc = new Date(`${ymd}T12:00:00.000Z`)
  const dayIndex = noonUtc.getUTCDay()
  const weekStartYmd = addCalendarDaysYmd(ymd, -dayIndex)
  const { year, month, day } = ymdParts(weekStartYmd)
  return zonedLocalToUtc(year, month, day, 0, 0, 0, timeZone)
}

function startOfZonedMonth(date: Date, timeZone: string): Date {
  const p = readZonedParts(date, timeZone)
  return zonedLocalToUtc(p.year, p.month, 1, 0, 0, 0, timeZone)
}

/**
 * Same shape as `resolveStaffReportsWindow`, but day boundaries use `timeZone`
 * (Tenant.timezone) instead of UTC midnight.
 */
export function resolveStaffReportsWindowInTimezone(
  period: StaffReportsPeriod,
  timeZone: string,
  customStart?: string,
  customEnd?: string,
  now = new Date(),
): StaffReportsWindow {
  const todayStart = zonedStartOfDay(now, timeZone)
  const todayEnd = zonedEndOfDay(now, timeZone)

  if (period === 'today') {
    const todayYmd = zonedYmd(now, timeZone)
    const prevYmd = addCalendarDaysYmd(todayYmd, -1)
    const { year, month, day } = ymdParts(prevYmd)
    return {
      period,
      startDate: todayStart,
      endDate: todayEnd,
      previousStart: zonedLocalToUtc(year, month, day, 0, 0, 0, timeZone),
      previousEnd: zonedLocalToUtc(year, month, day, 23, 59, 59, timeZone),
    }
  }

  if (period === 'week') {
    const startDate = startOfZonedWeekSunday(now, timeZone)
    const endDate = todayEnd
    const startYmd = zonedYmd(startDate, timeZone)
    const endYmd = zonedYmd(endDate, timeZone)
    const spanDays =
      Math.floor(
        (new Date(`${endYmd}T12:00:00.000Z`).getTime() -
          new Date(`${startYmd}T12:00:00.000Z`).getTime()) /
          86_400_000,
      ) + 1
    const prevEndYmd = addCalendarDaysYmd(startYmd, -1)
    const prevStartYmd = addCalendarDaysYmd(prevEndYmd, -(spanDays - 1))
    const prevStart = ymdParts(prevStartYmd)
    const prevEnd = ymdParts(prevEndYmd)
    return {
      period,
      startDate,
      endDate,
      previousStart: zonedLocalToUtc(
        prevStart.year,
        prevStart.month,
        prevStart.day,
        0,
        0,
        0,
        timeZone,
      ),
      previousEnd: zonedLocalToUtc(
        prevEnd.year,
        prevEnd.month,
        prevEnd.day,
        23,
        59,
        59,
        timeZone,
      ),
    }
  }

  if (period === 'custom' && customStart && customEnd) {
    const startParts = ymdParts(customStart)
    const endParts = ymdParts(customEnd)
    const startDate = zonedLocalToUtc(
      startParts.year,
      startParts.month,
      startParts.day,
      0,
      0,
      0,
      timeZone,
    )
    const endDate = zonedLocalToUtc(
      endParts.year,
      endParts.month,
      endParts.day,
      23,
      59,
      59,
      timeZone,
    )
    const spanMs = endDate.getTime() - startDate.getTime() + 1
    const previousEnd = new Date(startDate.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - spanMs + 1)
    // Snap previous window edges to zoned midnights of those instants.
    const prevStartYmd = zonedYmd(previousStart, timeZone)
    const prevEndYmd = zonedYmd(previousEnd, timeZone)
    const ps = ymdParts(prevStartYmd)
    const pe = ymdParts(prevEndYmd)
    return {
      period,
      startDate,
      endDate,
      previousStart: zonedLocalToUtc(ps.year, ps.month, ps.day, 0, 0, 0, timeZone),
      previousEnd: zonedLocalToUtc(pe.year, pe.month, pe.day, 23, 59, 59, timeZone),
    }
  }

  const startDate = startOfZonedMonth(now, timeZone)
  const endDate = todayEnd
  const monthStartYmd = zonedYmd(startDate, timeZone)
  const prevMonthEndYmd = addCalendarDaysYmd(monthStartYmd, -1)
  const pe = ymdParts(prevMonthEndYmd)
  const previousEnd = zonedLocalToUtc(pe.year, pe.month, pe.day, 23, 59, 59, timeZone)
  const previousStart = startOfZonedMonth(previousEnd, timeZone)
  return {
    period: period === 'custom' ? 'month' : period,
    startDate,
    endDate,
    previousStart,
    previousEnd,
  }
}

/** Enumerate YYYY-MM-DD keys in tenant TZ from window start through end (inclusive). */
export function enumerateZonedYmdRange(
  startDate: Date,
  endDate: Date,
  timeZone: string,
): string[] {
  const keys: string[] = []
  let ymd = zonedYmd(startDate, timeZone)
  const endYmd = zonedYmd(endDate, timeZone)
  while (ymd <= endYmd) {
    keys.push(ymd)
    ymd = addCalendarDaysYmd(ymd, 1)
  }
  return keys
}
