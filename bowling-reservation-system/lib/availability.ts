import { prisma } from './db'
import { addMinutes, format, parse, isBefore, isAfter, startOfDay } from 'date-fns'

// Configuration
const TOTAL_LANES = 20 // Total number of lanes
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

/**
 * Calculate available time slots for a given date
 */
export async function calculateAvailability(date: Date): Promise<TimeSlot[]> {
  const dateStr = format(date, 'yyyy-MM-dd')
  const startOfDate = startOfDay(date)

  // Get operating hours for this day
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
  const operatingHours = await prisma.operatingHours.findUnique({
    where: { dayOfWeek },
  })

  // If closed or no operating hours, return empty
  if (!operatingHours || operatingHours.isClosed || !operatingHours.openTime || !operatingHours.closeTime) {
    return []
  }

  // Parse open and close times
  const openTime = parse(operatingHours.openTime, 'HH:mm', startOfDate)
  const closeTime = parse(operatingHours.closeTime, 'HH:mm', startOfDate)

  // Get all bookings for this date
  const bookings = await prisma.booking.findMany({
    where: {
      date: date,
      status: {
        not: 'CANCELLED',
      },
    },
  })

  // Get lane blocks for this date
  const laneBlocks = await prisma.laneBlock.findMany({
    where: {
      date: date,
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

    // Check bookings that overlap with this time slot
    for (const booking of bookings) {
      const bookingStart = parse(booking.startTime, 'HH:mm', startOfDate)
      const bookingEnd = addMinutes(bookingStart, booking.duration)

      // Check if booking overlaps with this time slot
      if (
        (isBefore(currentTime, bookingEnd) || currentTime.getTime() === bookingStart.getTime()) &&
        (isAfter(slotEndTime, bookingStart) || slotEndTime.getTime() === bookingEnd.getTime())
      ) {
        bookedLanes.add(booking.lane)
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

    const availableLanes = TOTAL_LANES - bookedLanes.size

    slots.push({
      time: timeStr,
      available: availableLanes > 0,
      availableLanes,
    })

    // Move to next time slot
    currentTime = addMinutes(currentTime, TIME_SLOT_INTERVAL)
  }

  return slots
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

  // Check bookings
  for (const booking of overlappingBookings) {
    const bStart = parse(booking.startTime, 'HH:mm', startOfDate)
    const bEnd = addMinutes(bStart, booking.duration)

    if (
      (isBefore(bookingStart, bEnd) || bookingStart.getTime() === bStart.getTime()) &&
      (isAfter(bookingEnd, bStart) || bookingEnd.getTime() === bEnd.getTime())
    ) {
      bookedLanes.add(booking.lane)
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
  const allLanes = Array.from({ length: TOTAL_LANES }, (_, i) => i + 1)
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


