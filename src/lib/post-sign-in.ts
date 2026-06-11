import { isDevWithoutDb } from '@/lib/env'
import {
  isBookingSignInFrom,
  isGenericSignInFrom,
  resolvePostSignInPath,
  sanitizeSignInFrom,
} from '@/lib/auth-paths'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/types'

export type PostSignInUser = {
  id: string
  role: Role
  email: string | null
}

/** Build find-my-booking detail URL (email required by that page). */
export function customerBookingDetailPath(
  confirmationCode: string,
  email: string,
): string {
  const code = confirmationCode.trim().toUpperCase()
  return `/find-my-booking/${code}?email=${encodeURIComponent(email.trim().toLowerCase())}`
}

/**
 * Where to send the user after sign-in (or when already signed in on `/signin`).
 * Role defaults win over generic `from` values like `/staff` or `/book`.
 * Customers with bookings land on their next (or latest) reservation.
 */
export async function getPostSignInPath(
  from: string,
  user: PostSignInUser,
): Promise<string> {
  const safe = sanitizeSignInFrom(from)
  let path: string

  if (isBookingSignInFrom(safe)) {
    if (user.role === 'CUSTOMER') {
      path = safe === '/book' ? '/book' : safe
    } else {
      path = resolvePostSignInPath('/staff', user.role)
    }
  } else if (!isGenericSignInFrom(safe)) {
    path = safe
  } else if (user.role !== 'CUSTOMER') {
    path = resolvePostSignInPath(from, user.role)
  } else {
    path = await findCustomerBookingPath(user)
  }

  if (user.role !== 'CUSTOMER' && isBookingSignInFrom(sanitizeSignInFrom(path))) {
    return resolvePostSignInPath('/staff', user.role)
  }

  return path
}

async function findCustomerBookingPath(
  user: PostSignInUser,
): Promise<string> {
  const email = user.email?.trim().toLowerCase()
  if (!email) return '/find-my-booking'

  if (isDevWithoutDb()) {
    return customerBookingDetailPath('MOCK01', 'jane@example.com')
  }

  const now = new Date()
  const bookingWhere = {
    OR: [{ userId: user.id }, { customerEmail: email }],
  }

  const upcoming = await prisma.booking.findFirst({
    where: {
      ...bookingWhere,
      status: { in: ['CONFIRMED', 'HOLD'] },
      startTime: { gte: now },
    },
    orderBy: { startTime: 'asc' },
    select: { confirmationCode: true },
  })
  if (upcoming) {
    return '/dashboard'
  }

  const latest = await prisma.booking.findFirst({
    where: bookingWhere,
    orderBy: { startTime: 'desc' },
    select: { confirmationCode: true },
  })
  if (latest) {
    return '/dashboard'
  }

  return '/find-my-booking'
}
