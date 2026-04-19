import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { formatTime12Hour } from '@/lib/time'

export type StaffCalendarBooking = {
  id: string
  date: string
  startTime: string
  lane: number
  duration: number
  numBowlers: number
  status: string
  user: { email: string; firstName?: string | null; lastName?: string | null }
  bookingPackages?: Array<{ package?: { name?: string } }>
}

export function getCalendarGridDays(visibleMonth: Date): Date[] {
  const weekStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 })
  const weekEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 })
  const days: Date[] = []

  let current = weekStart
  while (current <= weekEnd) {
    days.push(current)
    current = addDays(current, 1)
  }

  return days
}

export function groupBookingsByDate<T extends Pick<StaffCalendarBooking, 'date'>>(bookings: T[]) {
  const map = new Map<string, T[]>()
  for (const booking of bookings) {
    const dateKey = format(new Date(booking.date), 'yyyy-MM-dd')
    const items = map.get(dateKey) ?? []
    items.push(booking)
    map.set(dateKey, items)
  }
  return map
}

export function filterCalendarBookingsByQuery<T extends StaffCalendarBooking>(
  bookings: T[],
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return bookings

  return bookings.filter((booking) => {
    const packageName = booking.bookingPackages?.[0]?.package?.name ?? ''
    const laneLabel = `lane ${booking.lane}`
    return (
      booking.user.email.toLowerCase().includes(normalizedQuery) ||
      packageName.toLowerCase().includes(normalizedQuery) ||
      laneLabel.includes(normalizedQuery) ||
      formatTime12Hour(booking.startTime).toLowerCase().includes(normalizedQuery)
    )
  })
}
