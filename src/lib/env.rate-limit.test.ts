import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getRateLimitPolicy,
  getSentryStaffTracesSampleRate,
  getSentryTracesSampleRate,
  isRateLimitEnabled,
} from '@/lib/env'

describe('isRateLimitEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is off in test by default', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(isRateLimitEnabled()).toBe(false)
  })

  it('is on in production unless disabled', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RATE_LIMIT_ENABLED', '')
    expect(isRateLimitEnabled()).toBe(true)
    vi.stubEnv('RATE_LIMIT_ENABLED', 'false')
    expect(isRateLimitEnabled()).toBe(false)
  })

  it('can be enabled in development explicitly', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RATE_LIMIT_ENABLED', 'true')
    expect(isRateLimitEnabled()).toBe(true)
  })
})

describe('getRateLimitPolicy', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads per-bucket max from env', () => {
    vi.stubEnv('RATE_LIMIT_PROMO_VALIDATE_MAX', '99')
    const p = getRateLimitPolicy('promo_validate')
    expect(p.max).toBe(99)
    expect(p.windowMs).toBe(60_000)
  })
})

describe('getSentryTracesSampleRate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to 0 in test so Vitest does not emit traces', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(getSentryTracesSampleRate()).toBe(0)
  })

  it('defaults to 1.0 in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', '')
    expect(getSentryTracesSampleRate()).toBe(1)
  })

  it('defaults to 0.2 in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', '')
    expect(getSentryTracesSampleRate()).toBe(0.2)
  })

  it('clamps invalid production values to 0.2', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', 'not-a-number')
    expect(getSentryTracesSampleRate()).toBe(0.2)
  })

  it('honors an explicit override in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', '0.5')
    expect(getSentryTracesSampleRate()).toBe(0.5)
  })
})

describe('getSentryStaffTracesSampleRate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to 0 in test', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(getSentryStaffTracesSampleRate()).toBe(0)
  })

  it('defaults to 1.0 outside test', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SENTRY_STAFF_TRACES_SAMPLE_RATE', '')
    expect(getSentryStaffTracesSampleRate()).toBe(1)
  })
})
