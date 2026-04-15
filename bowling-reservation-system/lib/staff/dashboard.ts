import { formatTime12Hour } from '@/lib/time'

export type StaffDashboardBooking = {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  lanes?: string | null
  numBowlers: number
  status: string
  totalPrice?: number
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  bookingPackages?: Array<{
    package?: {
      name?: string | null
    } | null
  }>
}

export type StaffDashboardStatusFilter = 'all' | 'upcoming' | 'checked' | 'completed'

export type StaffDashboardStats = {
  bookingsToday: number
  availableLanes: number
  checkingInSoon: number
  revenueToday: number
}

const TOTAL_LANES_ASSUMED = 20
const CHECK_IN_SOON_WINDOW_MINUTES = 60

export function canEditReservationStatus(status: string): boolean {
  return status === 'PENDING' || status === 'PAID' || status === 'CONFIRMED'
}

export function customerDisplayNameFromBooking(booking: StaffDashboardBooking): string {
  const fullName = [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim()
  return fullName || booking.user.email || 'Guest'
}

export function secondaryBookingDetail(booking: StaffDashboardBooking): string {
  const primaryPackageName =
    booking.bookingPackages?.find((bp) => Boolean(bp.package?.name))?.package?.name?.trim() || ''
  const bowlersLabel = `${booking.numBowlers} bowler${booking.numBowlers > 1 ? 's' : ''}`
  return primaryPackageName ? `${bowlersLabel} · ${primaryPackageName}` : bowlersLabel
}

export function computeStaffDashboardStats(bookings: StaffDashboardBooking[]): StaffDashboardStats {
  const now = new Date()
  const paidOrConfirmed = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PAID')
  const checkingInSoon = paidOrConfirmed.filter((b) => {
    const bookingTime = new Date(`${b.date}T${b.startTime}`)
    const minsAway = (bookingTime.getTime() - now.getTime()) / (1000 * 60)
    return minsAway >= 0 && minsAway <= CHECK_IN_SOON_WINDOW_MINUTES
  }).length
  const occupiedNow = bookings.filter((b) => b.status === 'CHECKED_IN').length

  return {
    bookingsToday: bookings.length,
    availableLanes: Math.max(0, TOTAL_LANES_ASSUMED - occupiedNow),
    checkingInSoon,
    revenueToday: bookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0),
  }
}

export function matchesStaffDashboardFilters(
  booking: StaffDashboardBooking,
  query: string,
  statusFilter: StaffDashboardStatusFilter
): boolean {
  const q = query.trim().toLowerCase()
  const customerName = [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim()
  const matchesQuery =
    !q ||
    customerName.toLowerCase().includes(q) ||
    booking.user.email.toLowerCase().includes(q) ||
    booking.startTime.toLowerCase().includes(q) ||
    formatTime12Hour(booking.startTime).toLowerCase().includes(q) ||
    String(booking.lane).includes(q)

  const matchesFilter =
    statusFilter === 'all' ||
    (statusFilter === 'upcoming' && (booking.status === 'CONFIRMED' || booking.status === 'PENDING')) ||
    (statusFilter === 'checked' && booking.status === 'CHECKED_IN') ||
    (statusFilter === 'completed' && booking.status === 'PAID')

  return matchesQuery && matchesFilter
}

export const buildStaffDashboardStats = computeStaffDashboardStats
export const filterStaffDashboardBookings = <T extends StaffDashboardBooking>(
  bookings: T[],
  query: string,
  statusFilter: StaffDashboardStatusFilter
) => bookings.filter((booking) => matchesStaffDashboardFilters(booking, query, statusFilter))
export const getStaffSecondaryBookingDetail = secondaryBookingDetail
export const canEditStaffReservation = canEditReservationStatus

type StaffDashboardRowAction = {
  key: string
  label: string
  onClick: () => void
  className?: string
}

export type { StaffDashboardRowAction }

export function buildStaffDashboardRowActions(
  booking: StaffDashboardBooking,
  options: {
    canEditReservation: (status: string) => boolean
    onDetails: (bookingId: string) => void
    onEdit: (bookingId: string) => void
    onCheckIn: (bookingId: string) => void
  }
): StaffDashboardRowAction[] {
  const actions: StaffDashboardRowAction[] = [
    {
      key: 'details',
      label: 'Details',
      onClick: () => options.onDetails(booking.id),
    },
  ]

  if (options.canEditReservation(booking.status)) {
    actions.push({
      key: 'edit',
      label: 'Edit Reservation',
      onClick: () => options.onEdit(booking.id),
    })
  }

  if (booking.status === 'CONFIRMED' || booking.status === 'PAID') {
    actions.push({
      key: 'check-in',
      label: 'Check In',
      onClick: () => options.onCheckIn(booking.id),
      className: 'text-indigo-700 hover:bg-indigo-50',
    })
  }

  return actions
}
