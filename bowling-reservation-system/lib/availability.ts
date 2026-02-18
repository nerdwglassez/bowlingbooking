import { prisma } from './db'
import { addMinutes, format, parse, isBefore, isAfter, startOfDay } from 'date-fns'
import { getPricingSettings } from './settings'

// Configuration
const DEFAULT_TOTAL_LANES = 20 // Fallback total lanes
const TIME_SLOT_INTERVAL = 30 // 30-minute intervals
const DURATION_OPTIONS = [60, 90, 120, 150, 180] // Duration options in minutes

export interface TimeSlot {
  time: string // "14:00" format
  available: boolean
  availableLanes: number
}

export interface AvailabilityResult {
  date: string // "2024-01-15" format
  slots: TimeSlot[]
}

/** Default slots when DB is unavailable (e.g. migrations not run). 09:00–22:00, 30-min, all lanes. */
function getDefaultSlots(totalLanes: number = DEFAULT_TOTAL_LANES): TimeSlot[] {
  const slots: TimeSlot[] = []
  let current = parse('09:00', 'HH:mm', new Date())
  const close = parse('22:00', 'HH:mm', new Date())
  while (isBefore(current, close)) {
    slots.push({
      time: format(current, 'HH:mm'),
      available: true,
      availableLanes: totalLanes,
    })
    current = addMinutes(current, TIME_SLOT_INTERVAL)
  }
  return slots
}

/**
 * Calculate available time slots for a given date.
 * On DB errors (e.g. connection or missing tables), returns default slots so the booking UI still works.
 */
export async function calculateAvailability(date: Date): Promise<TimeSlot[]> {
  const startOfDate = startOfDay(date)

  try {
    const pricingSettings = await getPricingSettings()
    const totalLanes = Math.max(1, Math.floor(pricingSettings.totalLanes || DEFAULT_TOTAL_LANES))
    const reserveLanes = Math.max(0, Math.floor(pricingSettings.reserveLanes || 0))
    const bookableLaneCount = Math.max(0, totalLanes - reserveLanes)

    // Check special hours first (date-specific overrides)
    const specialHours = await prisma.specialHours.findUnique({
      where: { date: startOfDate },
    })

  let openTimeStr: string | null
  let closeTimeStr: string | null
  let isClosed: boolean

  if (specialHours) {
    openTimeStr = specialHours.openTime
    closeTimeStr = specialHours.closeTime
    isClosed = specialHours.isClosed
  } else {
    const dayOfWeek = date.getDay()
    const operatingHours = await prisma.operatingHours.findUnique({
      where: { dayOfWeek },
    })
    if (operatingHours) {
      openTimeStr = operatingHours.openTime
      closeTimeStr = operatingHours.closeTime
      isClosed = operatingHours.isClosed
    } else {
      // No operating hours in DB (e.g. seed not run): use default so users still see time slots
      openTimeStr = '09:00'
      closeTimeStr = '22:00'
      isClosed = false
    }
  }

  if (isClosed || !openTimeStr || !closeTimeStr) {
    return []
  }

  const openTime = parse(openTimeStr, 'HH:mm', startOfDate)
  const closeTime = parse(closeTimeStr, 'HH:mm', startOfDate)

  // Use startOfDate for DB queries so we match the calendar date consistently
  const bookings = await prisma.booking.findMany({
    where: {
      date: startOfDate,
      status: {
        not: 'CANCELLED',
      },
    },
  })

  const laneBlocks = await prisma.laneBlock.findMany({
    where: {
      date: startOfDate,
    },
  })

  // Generate time slots
  const slots: TimeSlot[] = []
  let currentTime = openTime

  while (isBefore(currentTime, closeTime)) {
    const timeStr = format(currentTime, 'HH:mm')
    const slotEndTime = addMinutes(currentTime, Math.max(...DURATION_OPTIONS)) // Check for max duration

    // Count booked lanes at this time
    let bookedLanes = new Set<number>()

    // Check bookings that overlap with this time slot (include multi-lane)
    for (const booking of bookings) {
      const bookingStart = parse(booking.startTime, 'HH:mm', startOfDate)
      const bookingEnd = addMinutes(bookingStart, booking.duration)

      if (
        (isBefore(currentTime, bookingEnd) || currentTime.getTime() === bookingStart.getTime()) &&
        (isAfter(slotEndTime, bookingStart) || slotEndTime.getTime() === bookingEnd.getTime())
      ) {
        let lanesForBooking: number[]
        if (booking.lanes) {
          try {
            const parsed = JSON.parse(booking.lanes) as number[] | string[]
            lanesForBooking = Array.isArray(parsed) ? parsed.map((l) => Number(l)) : [booking.lane]
          } catch {
            lanesForBooking = [booking.lane]
          }
        } else {
          lanesForBooking = [booking.lane]
        }
        lanesForBooking.forEach((l) => bookedLanes.add(l))
      }
    }

    // Check lane blocks that overlap with this time slot
    for (const block of laneBlocks) {
      const blockStart = parse(block.startTime, 'HH:mm', startOfDate)
      const blockEnd = parse(block.endTime, 'HH:mm', startOfDate)

      // Check if block overlaps with this time slot
      if (
        (isBefore(currentTime, blockEnd) || currentTime.getTime() === blockStart.getTime()) &&
        (isAfter(slotEndTime, blockStart) || slotEndTime.getTime() === blockEnd.getTime())
      ) {
        // Parse blocked lanes (JSON array)
        try {
          const blockedLanes = JSON.parse(block.lanes) as number[]
          blockedLanes.forEach(lane => bookedLanes.add(lane))
        } catch (e) {
          // If parsing fails, skip this block
        }
      }
    }

    const availableLanes = Math.max(0, bookableLaneCount - bookedLanes.size)

    slots.push({
      time: timeStr,
      available: availableLanes > 0,
      availableLanes,
    })

    // Move to next time slot
    currentTime = addMinutes(currentTime, TIME_SLOT_INTERVAL)
  }

  return slots
  } catch (err) {
    // DB unreachable, tables missing, or other error: return default slots so booking step 1 still works
    console.error('Availability fallback (using default slots):', err)
    return getDefaultSlots(DEFAULT_TOTAL_LANES)
  }
}

/**
 * Check if a specific time slot is available for booking
 */
export async function isTimeSlotAvailable(
  date: Date,
  startTime: string,
  duration: number,
  lane?: number
): Promise<{ available: boolean; availableLanes: number[] }> {
  const pricingSettings = await getPricingSettings()
  const totalLanes = Math.max(1, Math.floor(pricingSettings.totalLanes || DEFAULT_TOTAL_LANES))
  const reserveLanes = Math.max(0, Math.floor(pricingSettings.reserveLanes || 0))
  const maxBookableLane = Math.max(0, totalLanes - reserveLanes)
  const slots = await calculateAvailability(date)
  const targetSlot = slots.find(slot => slot.time === startTime)

  if (!targetSlot || !targetSlot.available) {
    return { available: false, availableLanes: [] }
  }

  // Get all bookings that would overlap
  const startOfDate = startOfDay(date)
  const bookingStart = parse(startTime, 'HH:mm', startOfDate)
  const bookingEnd = addMinutes(bookingStart, duration)

  const overlappingBookings = await prisma.booking.findMany({
    where: {
      date: date,
      status: {
        not: 'CANCELLED',
      },
    },
  })

  // Get overlapping lane blocks
  const overlappingBlocks = await prisma.laneBlock.findMany({
    where: {
      date: date,
    },
  })

  const bookedLanes = new Set<number>()

  // Check bookings (include multi-lane)
  for (const booking of overlappingBookings) {
    const bStart = parse(booking.startTime, 'HH:mm', startOfDate)
    const bEnd = addMinutes(bStart, booking.duration)

    if (
      (isBefore(bookingStart, bEnd) || bookingStart.getTime() === bStart.getTime()) &&
      (isAfter(bookingEnd, bStart) || bookingEnd.getTime() === bEnd.getTime())
    ) {
      const lanesForBooking = booking.lanes ? (JSON.parse(booking.lanes) as number[]) : [booking.lane]
      lanesForBooking.forEach((l) => bookedLanes.add(l))
    }
  }

  // Check lane blocks
  for (const block of overlappingBlocks) {
    const bStart = parse(block.startTime, 'HH:mm', startOfDate)
    const bEnd = parse(block.endTime, 'HH:mm', startOfDate)

    if (
      (isBefore(bookingStart, bEnd) || bookingStart.getTime() === bStart.getTime()) &&
      (isAfter(bookingEnd, bStart) || bookingEnd.getTime() === bEnd.getTime())
    ) {
      try {
        const blockedLanes = JSON.parse(block.lanes) as number[]
        blockedLanes.forEach(lane => bookedLanes.add(lane))
      } catch (e) {
        // Skip if parsing fails
      }
    }
  }

  // Find available lanes
  const allLanes = Array.from({ length: maxBookableLane }, (_, i) => i + 1)
  const availableLanes = allLanes.filter(lane => !bookedLanes.has(lane))

  // If specific lane requested, check if it's available
  if (lane) {
    return {
      available: availableLanes.includes(lane),
      availableLanes,
    }
  }

  return {
    available: availableLanes.length > 0,
    availableLanes,
  }
}


