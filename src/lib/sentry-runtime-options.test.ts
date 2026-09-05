import { afterEach, describe, expect, it, vi } from 'vitest'

import { sentryTracesSampler } from '@/lib/sentry-runtime-options'

describe('sentryTracesSampler', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the staff rate for /staff transactions', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SENTRY_STAFF_TRACES_SAMPLE_RATE', '0.8')
    const inheritOrSampleWith = vi.fn(() => 0.2)
    expect(
      sentryTracesSampler({ name: '/staff', inheritOrSampleWith }),
    ).toBe(0.8)
    expect(inheritOrSampleWith).not.toHaveBeenCalled()
  })

  it('falls back to the default rate for customer booking', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SENTRY_TRACES_SAMPLE_RATE', '0.2')
    const inheritOrSampleWith = vi.fn((n: number) => n)
    expect(
      sentryTracesSampler({
        name: '/book/confirm',
        inheritOrSampleWith,
      }),
    ).toBe(0.2)
    expect(inheritOrSampleWith).toHaveBeenCalledWith(0.2)
  })
})
