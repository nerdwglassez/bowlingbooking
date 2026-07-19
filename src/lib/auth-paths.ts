import type { Role } from '@/types'

const ALLOWED_SIGN_IN_FROM = /^\/(?!\/)[A-Za-z0-9/_-]*$/

/** Normalize `from` query / hidden field; invalid values become `/`. */
export function sanitizeSignInFrom(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return '/'
  if (!ALLOWED_SIGN_IN_FROM.test(raw)) return '/'
  if (raw === '/signin') return '/'
  return raw
}

/** Entry paths that should not override role-based landing after sign-in. */
const GENERIC_SIGN_IN_FROM = new Set([
  '/',
  '/signin',
  '/staff',
  '/admin',
  '/find-my-booking',
])

export function isBookingSignInFrom(from: string): boolean {
  const safe = sanitizeSignInFrom(from)
  return safe === '/book' || safe.startsWith('/book/')
}

export function bookingReturnPath(from: string): string {
  const safe = sanitizeSignInFrom(from)
  if (!isBookingSignInFrom(safe)) return '/book'
  return safe
}

/** Sign-in entry that returns customers to their current booking step. */
export function bookingSignInPath(from: string): string {
  return `/signin?from=${bookingReturnPath(from)}`
}

export function isGenericSignInFrom(from: string): boolean {
  const safe = sanitizeSignInFrom(from)
  if (safe === '/' || safe === '/signin') return true
  if (isBookingSignInFrom(safe)) return false
  if (GENERIC_SIGN_IN_FROM.has(safe)) return true
  if (safe.startsWith('/find-my-booking/')) return true
  return false
}

/** Default landing path after sign-in when `from` is missing or `/`. */
export function defaultAppPathForRole(role: Role): string {
  switch (role) {
    case 'ADMIN':
    case 'MANAGER':
    case 'STAFF':
      return '/staff'
    default:
      return '/find-my-booking'
  }
}

/**
 * Post-auth redirect for staff roles. Honors deep links; generic `from`
 * values (e.g. `/staff` from the booking header) resolve by role.
 */
export function resolvePostSignInPath(from: string, role: Role): string {
  const safe = sanitizeSignInFrom(from)
  if (!isGenericSignInFrom(safe)) return safe
  return defaultAppPathForRole(role)
}
