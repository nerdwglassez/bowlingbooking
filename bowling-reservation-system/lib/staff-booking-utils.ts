/**
 * Shared helpers for staff booking display (check-in, dashboard, modals).
 */
import { parsePersistedBookingLanes } from '@/lib/booking/lanes'

export function customerDisplayName(user: {
  email: string
  firstName?: string | null
  lastName?: string | null
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  return name || user.email
}

export function getBookingLanes(booking: { lane: number; lanes?: string | null }): number[] {
  return parsePersistedBookingLanes(booking)
}

export function getPrimaryPackageName(booking: {
  bookingPackages?: Array<{ package?: { name?: string } | null }> | null
}): string {
  const first = booking.bookingPackages?.[0]?.package?.name
  return first ?? 'Standard Booking'
}

export function getInitials(user: {
  email: string
  firstName?: string | null
  lastName?: string | null
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  const local = user.email.split('@')[0] || 'G'
  const pieces = local.split(/[._-]/).filter(Boolean)
  if (pieces.length >= 2) return `${pieces[0][0]}${pieces[1][0]}`.toUpperCase()
  return local.slice(0, 2).toUpperCase()
}
