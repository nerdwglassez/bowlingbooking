import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  assertRateLimit,
  checkRateLimit,
  getClientIdFromHeaderValues,
  rateLimitBucketForPathname,
  RateLimitExceededError,
  resetRateLimitStoreForTests,
} from '@/lib/rate-limit'

describe('rateLimitBucketForPathname', () => {
  it('maps find-my-booking paths', () => {
    expect(rateLimitBucketForPathname('/find-my-booking')).toBe('find_booking')
    expect(rateLimitBucketForPathname('/find-my-booking/ABC123')).toBe(
      'find_booking',
    )
  })

  it('maps ics API paths', () => {
    expect(rateLimitBucketForPathname('/api/bookings/abc/ics')).toBe(
      'booking_ics',
    )
  })

  it('returns null for unrelated paths', () => {
    expect(rateLimitBucketForPathname('/book')).toBeNull()
  })
})

describe('getClientIdFromHeaderValues', () => {
  it('uses the first x-forwarded-for hop', () => {
    const id = getClientIdFromHeaderValues((name) =>
      name === 'x-forwarded-for' ? '203.0.113.1, 10.0.0.1' : null,
    )
    expect(id).toBe('203.0.113.1')
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true')
    vi.stubEnv('RATE_LIMIT_FIND_BOOKING_MAX', '2')
    vi.stubEnv('RATE_LIMIT_WINDOW_SEC', '60')
  })

  afterEach(() => {
    resetRateLimitStoreForTests()
    vi.unstubAllEnvs()
  })

  it('allows requests under the cap', () => {
    expect(checkRateLimit('find_booking', '1.2.3.4').allowed).toBe(true)
    expect(checkRateLimit('find_booking', '1.2.3.4').allowed).toBe(true)
  })

  it('blocks when the cap is exceeded', () => {
    checkRateLimit('find_booking', '1.2.3.4')
    checkRateLimit('find_booking', '1.2.3.4')
    const third = checkRateLimit('find_booking', '1.2.3.4')
    expect(third.allowed).toBe(false)
    if (!third.allowed) {
      expect(third.retryAfterSec).toBeGreaterThan(0)
    }
  })

  it('assertRateLimit throws RateLimitExceededError', () => {
    assertRateLimit('find_booking', '9.9.9.9')
    assertRateLimit('find_booking', '9.9.9.9')
    expect(() => assertRateLimit('find_booking', '9.9.9.9')).toThrow(
      RateLimitExceededError,
    )
  })
})
