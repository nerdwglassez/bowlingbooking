import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  isDevWithoutDbMock: vi.fn(() => false),
  resolveAppBaseUrlMock: vi.fn(() => 'https://book.example.com'),
  retrievePaymentIntentMock: vi.fn(),
  signPaymentResumeTokenMock: vi.fn(() => 'signed token'),
  paymentResumeExpiresAtMock: vi.fn(
    () => new Date('2026-01-01T00:00:00.000Z'),
  ),
}))

vi.mock('@/lib/auth', () => ({
  requireRole: mocks.requireRoleMock,
}))

vi.mock('@/lib/env', () => ({
  isDevWithoutDb: mocks.isDevWithoutDbMock,
  resolveAppBaseUrl: mocks.resolveAppBaseUrlMock,
}))

vi.mock('@/lib/stripe', () => ({
  retrievePaymentIntent: mocks.retrievePaymentIntentMock,
}))

vi.mock('@/lib/payment-resume-token', () => ({
  paymentResumeExpiresAt: mocks.paymentResumeExpiresAtMock,
  signPaymentResumeToken: mocks.signPaymentResumeTokenMock,
  verifyPaymentResumeToken: vi.fn(),
}))

import { createPaymentResumeLink } from '@/lib/actions/payment-resume'

describe('createPaymentResumeLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleMock.mockResolvedValue({
      id: 'staff_1',
      email: 'staff@example.com',
      role: 'STAFF',
      tenantId: 't1',
    })
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.resolveAppBaseUrlMock.mockReturnValue('https://book.example.com')
    mocks.signPaymentResumeTokenMock.mockReturnValue('signed token')
    mocks.paymentResumeExpiresAtMock.mockReturnValue(
      new Date('2026-01-01T00:00:00.000Z'),
    )
    mocks.retrievePaymentIntentMock.mockResolvedValue({
      id: 'pi_123',
      amount: 4500,
      status: 'requires_payment_method',
      mocked: false,
    })
  })

  it('builds resume links from the centralized app base URL', async () => {
    const result = await createPaymentResumeLink('pi_123')

    expect(result.url).toBe(
      'https://book.example.com/book/resume-payment?t=signed%20token',
    )
    expect(mocks.resolveAppBaseUrlMock).toHaveBeenCalled()
  })

  it('uses the same app base URL in dev-without-db mode', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)

    const result = await createPaymentResumeLink('pi_mock')

    expect(result.url).toBe(
      'https://book.example.com/book/resume-payment?t=signed%20token',
    )
    expect(mocks.retrievePaymentIntentMock).not.toHaveBeenCalled()
  })
})
