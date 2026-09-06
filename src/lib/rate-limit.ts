/**
 * In-process fixed-window rate limiting for public, unauthenticated surfaces.
 *
 * Primary production defense remains WAF / reverse-proxy limits (see
 * `.claude/contracts/OPS.md` and `docs/RUNBOOK.md` § Edge security).
 * This module is a best-effort per-instance backstop for dev and small deploys.
 */

import { getRateLimitPolicy, isRateLimitEnabled } from '@/lib/env'

export type RateLimitBucket =
  | 'find_booking'
  | 'booking_ics'
  | 'promo_validate'
  | 'password_reset'
  | 'address_autocomplete'

export class RateLimitExceededError extends Error {
  readonly retryAfterSec: number

  constructor(retryAfterSec: number) {
    super(
      retryAfterSec >= 60
        ? `Too many requests. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`
        : `Too many requests. Try again in ${retryAfterSec} seconds.`,
    )
    this.name = 'RateLimitExceededError'
    this.retryAfterSec = retryAfterSec
  }
}

type Window = { count: number; resetAt: number }

const store = new Map<string, Window>()

/** Visible for tests — clears the in-memory store. */
export function resetRateLimitStoreForTests(): void {
  store.clear()
}

function windowKey(bucket: RateLimitBucket, clientId: string): string {
  return `${bucket}:${clientId}`
}

export function checkRateLimit(
  bucket: RateLimitBucket,
  clientId: string,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  if (!isRateLimitEnabled()) return { allowed: true }

  const { max, windowMs } = getRateLimitPolicy(bucket)
  const now = Date.now()
  const key = windowKey(bucket, clientId)

  let window = store.get(key)
  if (!window || now >= window.resetAt) {
    window = { count: 0, resetAt: now + windowMs }
    store.set(key, window)
  }

  window.count += 1
  if (window.count > max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    }
  }
  return { allowed: true }
}

export function assertRateLimit(
  bucket: RateLimitBucket,
  clientId: string,
): void {
  const result = checkRateLimit(bucket, clientId)
  if (!result.allowed) {
    throw new RateLimitExceededError(result.retryAfterSec)
  }
}

/** Resolve client IP from proxy-forwarded headers (first hop). */
export function getClientIdFromHeaderValues(
  get: (name: string) => string | null,
): string {
  const forwarded = get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

export function rateLimitBucketForPathname(
  pathname: string,
): RateLimitBucket | null {
  if (
    pathname === '/find-my-booking' ||
    pathname.startsWith('/find-my-booking/') ||
    pathname === '/book/resume-payment'
  ) {
    return 'find_booking'
  }
  if (/^\/api\/bookings\/[^/]+\/ics\/?$/.test(pathname)) {
    return 'booking_ics'
  }
  return null
}
