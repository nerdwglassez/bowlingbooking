// cockpit-display.ts — Pure helpers for the staff cockpit (staff-app-v2.html).

import type {
  BlockedSlotRow,
  CockpitBookingRow,
  CockpitLaneCard,
  CockpitStats,
  StaffBookingRow,
} from '@/lib/actions/staff'
import { formatLanePill } from '@/lib/schedule-display'

export type CockpitLaneState = CockpitLaneCard['state']
export type CockpitSubview = 'overview' | 'lanes'
export type CockpitTimeWindow = 2 | 4 | 8 | 'day'

export const COCKPIT_LATE_GRACE_MS = 5 * 60_000

export type TimelineBlockState = 'occupied' | 'upcoming' | 'completed'

export interface CockpitTimelineBlock {
  bookingId: string
  label: string
  state: TimelineBlockState
  leftPercent: number
  widthPercent: number
}

export interface CockpitTimelineLane {
  number: number
  blocked?: { reason: string }
  blocks: CockpitTimelineBlock[]
}

export interface CockpitTimelineHourLabel {
  label: string
  isNow?: boolean
}

export interface CockpitTimeline {
  windowStart: Date
  windowEnd: Date
  nowPercent: number
  hourLabels: CockpitTimelineHourLabel[]
  lanes: CockpitTimelineLane[]
}

const TIME_UNTIL = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

const HOUR_ONLY = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
})

const MINUTE_ONLY = new Intl.DateTimeFormat('en-US', {
  minute: '2-digit',
})

export function formatUpcomingTimeParts(d: Date): { hour: string; ampm: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? ''
  const minute = parts.find((p) => p.type === 'minute')?.value ?? ''
  const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value ?? ''
  return {
    hour: minute === '00' ? hour : `${hour}:${minute}`,
    ampm: dayPeriod,
  }
}

export function formatLaneBadge(laneNumbers: number[]): string {
  if (laneNumbers.length === 0) return '—'
  const label = formatLanePill(laneNumbers)
  return label.replace(/^Ln /, 'Ln ')
}

export function bookingListStatus(
  booking: StaffBookingRow,
  now: Date,
  paymentPending = false,
  graceMs = COCKPIT_LATE_GRACE_MS,
): CockpitBookingRow['listStatus'] {
  if (paymentPending) return 'payment'
  if (isLateBooking(booking, now, graceMs)) return 'late'
  if (booking.status === 'COMPLETED') return 'checkedin'
  if (booking.status === 'HOLD') return 'pending'
  return 'confirmed'
}

export function isLateBooking(
  booking: Pick<
    StaffBookingRow,
    'status' | 'startTime' | 'endTime' | 'source'
  >,
  now: Date,
  graceMs = COCKPIT_LATE_GRACE_MS,
): boolean {
  if (booking.source === 'WALK_IN') return false
  if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
    return false
  }
  if (now < booking.startTime) return false
  const msAfterStart = now.getTime() - booking.startTime.getTime()
  if (msAfterStart < graceMs) return false
  return now < booking.endTime
}

export function lateMinutes(booking: StaffBookingRow, now: Date): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - booking.startTime.getTime()) / 60_000),
  )
}

export function partitionCockpitBookings(
  bookings: CockpitBookingRow[],
  now: Date,
): { late: CockpitBookingRow[]; upcoming: CockpitBookingRow[] } {
  const late: CockpitBookingRow[] = []
  const upcoming: CockpitBookingRow[] = []

  for (const booking of bookings) {
    if (booking.status === 'CANCELLED') continue
    if (booking.listStatus === 'late' || isLateBooking(booking, now)) {
      late.push(booking)
      continue
    }
    if (booking.status === 'COMPLETED') continue
    const msAfterStart = now.getTime() - booking.startTime.getTime()
    const inGrace =
      now >= booking.startTime && msAfterStart < COCKPIT_LATE_GRACE_MS
    if (now < booking.startTime || inGrace) {
      upcoming.push(booking)
    }
  }

  late.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  upcoming.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  return { late, upcoming }
}

export function buildCockpitStats(
  bookings: CockpitBookingRow[],
  now: Date,
  graceMs = COCKPIT_LATE_GRACE_MS,
): CockpitStats {
  const today = bookings.filter((b) => b.status !== 'CANCELLED')
  const lateBookings = today.filter((b) => isLateBooking(b, now, graceMs))
  const lateIds = new Set(lateBookings.map((b) => b.id))
  const done = today.filter((b) => b.status === 'COMPLETED').length
  const active = today.filter(
    (b) => {
      if (lateIds.has(b.id)) return false
      if (b.status === 'COMPLETED') return false
      if (now < b.startTime || now >= b.endTime) return false
      const msAfterStart = now.getTime() - b.startTime.getTime()
      if (msAfterStart < graceMs) return false
      return true
    },
  ).length
  const upcoming = today.filter(
    (b) =>
      !lateIds.has(b.id) &&
      b.status !== 'COMPLETED' &&
      (now < b.startTime ||
        (now >= b.startTime &&
          now.getTime() - b.startTime.getTime() < graceMs)),
  ).length
  return {
    total: today.length,
    upcoming,
    active,
    done,
    late: lateBookings.length,
  }
}

export type CockpitHourlyPoint = {
  hour: string
  count: number
}

/** Remaining-day booking counts by hour from the cockpit snapshot. */
export function buildCockpitHourlyBookings(
  bookings: CockpitBookingRow[],
  now: Date,
): CockpitHourlyPoint[] {
  const hourFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric' })
  const points: CockpitHourlyPoint[] = []
  for (let hour = now.getHours(); hour < 24; hour++) {
    const slotStart = new Date(now)
    slotStart.setHours(hour, 0, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 3_600_000)
    const count = bookings.filter(
      (booking) =>
        booking.status !== 'CANCELLED' &&
        booking.startTime < slotEnd &&
        booking.endTime > slotStart,
    ).length
    points.push({ hour: hourFmt.format(slotStart), count })
  }
  return points
}

/** Context bar date — wireframe "Sat May 10". */
export function formatCockpitContextDate(now: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now)
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function timelineWindowMs(window: CockpitTimeWindow, now: Date): {
  start: Date
  end: Date
  nowPercent: number
} {
  if (window === 'day') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start.getTime() + 86_400_000)
    const duration = end.getTime() - start.getTime()
    const nowPercent = clampPercent(
      ((now.getTime() - start.getTime()) / duration) * 100,
    )
    return { start, end, nowPercent }
  }

  const windowMs = window * 3_600_000
  const nowMs = now.getTime()
  const start = new Date(nowMs - windowMs * 0.48)
  const end = new Date(start.getTime() + windowMs)
  const nowPercent = clampPercent(((nowMs - start.getTime()) / windowMs) * 100)
  return { start, end, nowPercent }
}

function formatTimelineHour(d: Date): string {
  const hour = d.getHours()
  const isPm = hour >= 12
  const h12 = hour % 12 || 12
  return `${h12}${isPm ? 'P' : 'A'}`
}

function buildTimelineHourLabels(
  windowStart: Date,
  windowEnd: Date,
  now: Date,
  nowPercent: number,
): CockpitTimelineHourLabel[] {
  const segments = 5
  const duration = windowEnd.getTime() - windowStart.getTime()
  const nowSlot = Math.round((nowPercent / 100) * segments)

  const labels: CockpitTimelineHourLabel[] = []
  for (let i = 0; i <= segments; i++) {
    const isNow = i === nowSlot
    if (isNow) {
      labels.push({ label: 'NOW', isNow: true })
      continue
    }
    const t = new Date(windowStart.getTime() + (duration * i) / segments)
    labels.push({ label: formatTimelineHour(t) })
  }
  return labels
}

function blockCoversLaneInWindow(
  block: BlockedSlotRow,
  laneNumber: number,
  windowStart: Date,
  windowEnd: Date,
): boolean {
  if (block.endTime <= windowStart || block.startTime >= windowEnd) return false
  if (block.lanes.length === 0 || block.lanes.includes(laneNumber)) return true
  return false
}

function blockActiveOnLane(
  block: BlockedSlotRow,
  laneNumber: number,
  instant: Date,
): boolean {
  if (instant < block.startTime || instant >= block.endTime) return false
  return block.lanes.length === 0 || block.lanes.includes(laneNumber)
}

function timelineBlockState(
  booking: CockpitBookingRow,
  now: Date,
): TimelineBlockState {
  if (now >= booking.endTime || booking.status === 'COMPLETED') {
    return 'completed'
  }
  if (now >= booking.startTime) return 'occupied'
  return 'upcoming'
}

function customerShortName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 8)
  return parts[parts.length - 1]!.slice(0, 10)
}

export function buildCockpitTimeline(
  totalLanes: number,
  bookings: CockpitBookingRow[],
  blocks: BlockedSlotRow[],
  now: Date,
  window: CockpitTimeWindow,
): CockpitTimeline {
  const { start: windowStart, end: windowEnd, nowPercent } =
    timelineWindowMs(window, now)
  const duration = windowEnd.getTime() - windowStart.getTime()

  const lanes: CockpitTimelineLane[] = []

  for (let number = 1; number <= totalLanes; number++) {
    const coveringBlock = blocks.find((block) =>
      blockCoversLaneInWindow(block, number, windowStart, windowEnd),
    )
    const blockedNow = blocks.find((block) =>
      blockActiveOnLane(block, number, now),
    )

    if (blockedNow && coveringBlock) {
      lanes.push({
        number,
        blocked: { reason: coveringBlock.reason ?? 'Lane block' },
        blocks: [],
      })
      continue
    }

    const laneBlocks: CockpitTimelineBlock[] = []

    for (const booking of bookings) {
      if (!booking.laneNumbers.includes(number)) continue
      if (booking.endTime <= windowStart || booking.startTime >= windowEnd) {
        continue
      }

      const overlapStart = Math.max(
        booking.startTime.getTime(),
        windowStart.getTime(),
      )
      const overlapEnd = Math.min(
        booking.endTime.getTime(),
        windowEnd.getTime(),
      )
      const overlapMs = overlapEnd - overlapStart
      if (overlapMs <= 0) continue

      laneBlocks.push({
        bookingId: booking.id,
        label: customerShortName(booking.customerName),
        state: timelineBlockState(booking, now),
        leftPercent: clampPercent(
          ((overlapStart - windowStart.getTime()) / duration) * 100,
        ),
        widthPercent: clampPercent((overlapMs / duration) * 100),
      })
    }

    lanes.push({ number, blocks: laneBlocks })
  }

  return {
    windowStart,
    windowEnd,
    nowPercent,
    hourLabels: buildTimelineHourLabels(
      windowStart,
      windowEnd,
      now,
      nowPercent,
    ),
    lanes,
  }
}

export function filterCockpitBookings(
  bookings: CockpitBookingRow[],
  query: string,
): CockpitBookingRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return bookings
  return bookings.filter((b) => {
    return (
      b.customerName.toLowerCase().includes(q) ||
      b.confirmationCode.toLowerCase().includes(q) ||
      (b.customerPhone?.toLowerCase().includes(q) ?? false) ||
      b.customerEmail.toLowerCase().includes(q)
    )
  })
}

function isBlockedNow(
  laneNumber: number,
  blocks: BlockedSlotRow[],
  now: Date,
): BlockedSlotRow | null {
  for (const block of blocks) {
    if (now < block.startTime || now >= block.endTime) continue
    if (block.lanes.length === 0 || block.lanes.includes(laneNumber)) {
      return block
    }
  }
  return null
}

function bookingCoversLane(
  booking: StaffBookingRow & { laneNumbers: number[] },
  laneNumber: number,
  instant: Date,
): 'active' | 'upcoming' | null {
  if (booking.status === 'CANCELLED') return null
  if (!booking.laneNumbers.includes(laneNumber)) return null
  if (instant >= booking.startTime && instant < booking.endTime) return 'active'
  if (instant < booking.startTime) return 'upcoming'
  return null
}

/** Greedy lane assignment when BookingLane rows are not populated yet. */
export function assignLanesGreedy(
  bookings: StaffBookingRow[],
  totalLanes: number,
): Map<string, number[]> {
  const map = new Map<string, number[]>()
  let cursor = 1
  const sorted = [...bookings]
    .filter((b) => b.status !== 'CANCELLED')
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  for (const booking of sorted) {
    const lanes: number[] = []
    for (let i = 0; i < booking.laneCount; i++) {
      const lane = ((cursor - 1 + i) % totalLanes) + 1
      lanes.push(lane)
    }
    cursor += booking.laneCount
    if (cursor > totalLanes) cursor = 1
    map.set(booking.id, lanes)
  }
  return map
}

export function buildCockpitLanes(
  totalLanes: number,
  bookings: CockpitBookingRow[],
  blocks: BlockedSlotRow[],
  now: Date,
): CockpitLaneCard[] {
  const cards: CockpitLaneCard[] = []

  for (let number = 1; number <= totalLanes; number++) {
    const block = isBlockedNow(number, blocks, now)
    if (block) {
      cards.push({
        number,
        state: 'blocked',
        statusLabel: 'Blocked',
        detail: block.reason ?? 'Lane block',
      })
      continue
    }

    let activeBooking: CockpitBookingRow | null = null
    let upcomingBooking: CockpitBookingRow | null = null

    for (const booking of bookings) {
      const cover = bookingCoversLane(booking, number, now)
      if (cover === 'active') {
        activeBooking = booking
        break
      }
      if (cover === 'upcoming') {
        if (
          !upcomingBooking ||
          booking.startTime < upcomingBooking.startTime
        ) {
          upcomingBooking = booking
        }
      }
    }

    if (activeBooking) {
      cards.push({
        number,
        state: 'occupied',
        statusLabel: 'Active',
        timeLabel: `until ${TIME_UNTIL.format(activeBooking.endTime)}`,
        bookingId: activeBooking.id,
      })
      continue
    }

    if (upcomingBooking) {
      cards.push({
        number,
        state: 'upcoming',
        statusLabel: 'Upcoming',
        timeLabel: TIME_UNTIL.format(upcomingBooking.startTime),
        bookingId: upcomingBooking.id,
      })
      continue
    }

    cards.push({
      number,
      state: 'available',
      statusLabel: 'Open',
    })
  }

  return cards
}

export function toCockpitBookings(
  bookings: StaffBookingRow[],
  laneAssignments: Map<string, number[]>,
  now: Date,
  paymentPendingIds?: Set<string>,
): CockpitBookingRow[] {
  return bookings
    .filter((b) => b.status !== 'CANCELLED')
    .map((booking) => {
      const paymentPending =
        booking.paymentPending === true ||
        paymentPendingIds?.has(booking.id) === true
      return {
        ...booking,
        laneNumbers: laneAssignments.get(booking.id) ?? [],
        paymentPending,
        listStatus: bookingListStatus(booking, now, paymentPending),
      }
    })
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

export function formatBookingMeta(booking: CockpitBookingRow): string {
  const parts = [
    `${booking.bowlerCount} bowler${booking.bowlerCount === 1 ? '' : 's'}`,
    booking.packageName,
  ]
  if (booking.paymentPending) {
    parts.push('⚠ Payment pending')
  }
  return parts.join(' · ')
}

export function formatLateMeta(
  booking: CockpitBookingRow,
  now: Date,
): string {
  const mins = lateMinutes(booking, now)
  return `${formatBookingMeta(booking)} · ${mins} min late`
}

/** Header clock line — wireframe "Saturday · 2:14 PM". */
export function formatCockpitClock(now: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(now)
  const day = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = parts.find((p) => p.type === 'hour')?.value ?? ''
  const minute = parts.find((p) => p.type === 'minute')?.value ?? ''
  const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value ?? '')
    .replace(/\s/g, '')
    .toUpperCase()
  return `${day} · ${hour}:${minute} ${dayPeriod}`
}

export function buildCockpitClockLine(now = new Date(), timeZone?: string): string {
  return formatCockpitClock(now, timeZone)
}

export { HOUR_ONLY, MINUTE_ONLY }
