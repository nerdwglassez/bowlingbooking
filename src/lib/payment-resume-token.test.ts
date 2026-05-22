import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  signPaymentResumeToken,
  verifyPaymentResumeToken,
} from '@/lib/payment-resume-token'

describe('payment-resume-token', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('round-trips a payment intent id', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-for-resume-token')
    const token = signPaymentResumeToken('pi_test_123')
    const verified = verifyPaymentResumeToken(token)
    expect(verified?.paymentIntentId).toBe('pi_test_123')
  })

  it('rejects tampered tokens', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret-for-resume-token')
    const token = signPaymentResumeToken('pi_test_123')
    const bad = `${token}x`
    expect(verifyPaymentResumeToken(bad)).toBeNull()
  })
})
