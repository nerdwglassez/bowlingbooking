import {
  customerDisplayName,
  getBookingLanes,
  getPrimaryPackageName,
} from '@/lib/staff-booking-utils'

export type StaffSchedulingBooking = {
  id: string
  startTime: string
  duration: number
  lane: number
  lanes?: string | null
  status: string
  user: {
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  bookingPackages?: Array<{ package?: { name?: string } | null }>
}

export type TimelineSlot = {
  startTime: string
  endTime: string
  startMinutes: number
  endMinutes: number
  index: number
}

export type TimelineEntry = {
  key: string
  bookingId: string
  lane: number
  status: string
  customerName: string
  packageName: string
  startTime: string
  endTime: string
  startMinutes: number
  endMinutes: number
  startSlotIndex: number
  slotSpan: number
}

export type SchedulingConflict = {
  lane: number
  firstBookingId: string
  secondBookingId: string
}

const DEFAULT_TIMELINE_START = '10:00'
const DEFAULT_TIMELINE_END = '23:00'
const DEFAULT_SLOT_MINUTES = 30

export function timeStringToMinutes(time: string): number {
  const [rawHours, rawMinutes] = time.split(':')
  const hours = Number(rawHours)
  const minutes = Number(rawMinutes)

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error(`Invalid time value: ${time}`)
  }

  return hours * 60 + minutes
}

export function minutesToTimeString(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function getBookingEndTime(startTime: string, durationMinutes: number): string {
  const endMinutes = timeStringToMinutes(startTime) + Math.max(0, durationMinutes)
  return minutesToTimeString(endMinutes)
}

export function getTimelineSlots(options?: {
  startTime?: string
  endTime?: string
  slotMinutes?: number
}): TimelineSlot[] {
  const startTime = options?.startTime ?? DEFAULT_TIMELINE_START
  const endTime = options?.endTime ?? DEFAULT_TIMELINE_END
  const slotMinutes = options?.slotMinutes ?? DEFAULT_SLOT_MINUTES

  const start = timeStringToMinutes(startTime)
  const end = timeStringToMinutes(endTime)
  if (end <= start) {
    throw new Error('Timeline end time must be after start time')
  }
  if (slotMinutes <= 0) {
    throw new Error('slotMinutes must be greater than zero')
  }

  const slots: TimelineSlot[] = []
  let cursor = start
  let index = 0
  while (cursor < end) {
    const next = Math.min(cursor + slotMinutes, end)
    slots.push({
      startTime: minutesToTimeString(cursor),
      endTime: minutesToTimeString(next),
      startMinutes: cursor,
      endMinutes: next,
      index,
    })
    cursor = next
    index += 1
  }
  return slots
}

export function buildTimelineEntries(
  bookings: StaffSchedulingBooking[],
  options?: {
    startTime?: string
    endTime?: string
    slotMinutes?: number
  }
): TimelineEntry[] {
  const slots = getTimelineSlots(options)
  const timelineStart = slots[0]?.startMinutes ?? 0
  const timelineEnd = slots[slots.length - 1]?.endMinutes ?? timelineStart
  const slotMinutes = options?.slotMinutes ?? DEFAULT_SLOT_MINUTES

  return bookings
    .flatMap((booking) => {
      const startMinutes = timeStringToMinutes(booking.startTime)
      const endMinutes = startMinutes + Math.max(0, booking.duration)

      const clampedStart = Math.max(startMinutes, timelineStart)
      const clampedEnd = Math.min(endMinutes, timelineEnd)
      if (clampedEnd <= clampedStart) return []

      const startSlotIndex = Math.floor((clampedStart - timelineStart) / slotMinutes)
      const slotSpan = Math.max(1, Math.ceil((clampedEnd - clampedStart) / slotMinutes))
      const customerName = customerDisplayName(booking.user)
      const packageName = getPrimaryPackageName(booking)

      return getBookingLanes(booking).map((lane) => ({
        key: `${booking.id}:${lane}`,
        bookingId: booking.id,
        lane,
        status: booking.status,
        customerName,
        packageName,
        startTime: booking.startTime,
        endTime: getBookingEndTime(booking.startTime, booking.duration),
        startMinutes,
        endMinutes,
        startSlotIndex,
        slotSpan,
      }))
    })
    .sort((a, b) => {
      if (a.lane !== b.lane) return a.lane - b.lane
      if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes
      return a.bookingId.localeCompare(b.bookingId)
    })
}

export function detectSchedulingConflicts(entries: TimelineEntry[]): SchedulingConflict[] {
  const byLane = new Map<number, TimelineEntry[]>()
  for (const entry of entries) {
    const laneEntries = byLane.get(entry.lane) ?? []
    laneEntries.push(entry)
    byLane.set(entry.lane, laneEntries)
  }

  const conflicts: SchedulingConflict[] = []
  for (const [lane, laneEntries] of byLane.entries()) {
    const sorted = [...laneEntries].sort((a, b) => a.startMinutes - b.startMinutes)
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]
      const current = sorted[i]
      if (current.startMinutes < prev.endMinutes) {
        conflicts.push({
          lane,
          firstBookingId: prev.bookingId,
          secondBookingId: current.bookingId,
        })
      }
    }
  }
  return conflicts
}
