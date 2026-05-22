import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getRateLimitPolicy,
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

  it('returns 0 outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(getSentryTracesSampleRate()).toBe(0)
  })

  it('defaults to 0.1 in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', '')
    expect(getSentryTracesSampleRate()).toBe(0.1)
  })

  it('clamps invalid production values to 0.1', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', 'not-a-number')
    expect(getSentryTracesSampleRate()).toBe(0.1)
  })
})
