import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const bookingUpdate = vi.fn()
  const paymentUpdate = vi.fn()
  const auditCreate = vi.fn()
  const txStub = {
    booking: { update: bookingUpdate },
    payment: { update: paymentUpdate },
    auditLog: { create: auditCreate },
  }
  return {
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    bookingFindFirst: vi.fn(),
    paymentFindUnique: vi.fn(),
    bookingUpdate,
    paymentUpdate,
    auditCreate,
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
    getTenantMock: vi.fn(),
    getCancellationPolicyMock: vi.fn(),
    createRefundMock: vi.fn(),
    sendCancellationMock: vi.fn(),
    isStripeMockedMock: vi.fn(() => false),
  }
})

vi.mock('@/lib/env', () => ({
  isDevWithoutDb: mocks.isDevWithoutDbMock,
  isRateLimitEnabled: () => false,
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findFirst: mocks.bookingFindFirst },
    payment: { findUnique: mocks.paymentFindUnique },
    $transaction: mocks.txMock,
  },
}))
vi.mock('@/lib/tenant', () => ({
  getTenant: mocks.getTenantMock,
  getCancellationPolicy: mocks.getCancellationPolicyMock,
}))
vi.mock('@/lib/stripe', () => ({
  createRefund: mocks.createRefundMock,
  isStripeMocked: mocks.isStripeMockedMock,
}))
vi.mock('@/lib/email', () => ({
  sendBookingCancellation: mocks.sendCancellationMock,
}))

import { cancelBookingAction, getBookingByLookup } from './customer'

function bookingFixture(overrides: Partial<{
  id: string
  confirmationCode: string
  customerEmail: string
  startHoursFromNow: number
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'HOLD'
  isRefunded: boolean
  totalAmount: number
}> = {}) {
  const startHours = overrides.startHoursFromNow ?? 48
  const start = new Date(Date.now() + startHours * 3_600_000)
  const end = new Date(start.getTime() + 3_600_000)
  return {
    id: overrides.id ?? 'bk_1',
    confirmationCode: overrides.confirmationCode ?? 'ABC123',
    startTime: start,
    endTime: end,
    bowlerCount: 4,
    laneCount: 1,
    totalAmount: overrides.totalAmount ?? 4500,
    customerName: 'Jane Doe',
    customerEmail: overrides.customerEmail ?? 'jane@example.com',
    status: overrides.status ?? 'CONFIRMED',
    isRefunded: overrides.isRefunded ?? false,
    package: { name: 'Classic Bowling' },
  }
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => {
    if (typeof m === 'function' && 'mockReset' in m) {
      ;(m as ReturnType<typeof vi.fn>).mockReset()
    }
  })
  mocks.isDevWithoutDbMock.mockReturnValue(false)
  mocks.isStripeMockedMock.mockReturnValue(false)
  mocks.getTenantMock.mockResolvedValue({
    id: 't1',
    name: 'Royal Z',
    slug: 'royalz',
    address: 'a',
    phone: '(555)',
    timezone: 'America/New_York',
    themeSlug: 'default',
    holdTimeoutMins: 10,
    maxOnlineBowlers: 18,
    config: {},
  })
  mocks.getCancellationPolicyMock.mockReturnValue({
    windowHours: 24,
    refundPercent: 100,
  })
  mocks.sendCancellationMock.mockResolvedValue({ id: null })
  mocks.createRefundMock.mockResolvedValue({ id: 're_1', status: 'pending' })
  mocks.txMock.mockImplementation(
    async (fn) =>
      fn({
        booking: { update: mocks.bookingUpdate },
        payment: { update: mocks.paymentUpdate },
        auditLog: { create: mocks.auditCreate },
      } as Parameters<typeof fn>[0]),
  )
})

describe('getBookingByLookup', () => {
  it('returns null when email or code is blank', async () => {
    expect(
      await getBookingByLookup({ email: '', confirmationCode: 'X' }),
    ).toBeNull()
    expect(
      await getBookingByLookup({ email: 'x@y.co', confirmationCode: '' }),
    ).toBeNull()
    expect(mocks.bookingFindFirst).not.toHaveBeenCalled()
  })

  it('lowercases email and uppercases code before query', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    await getBookingByLookup({
      email: 'Jane@Example.com',
      confirmationCode: 'abc123',
    })
    expect(mocks.bookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ confirmationCode: 'ABC123' }),
      }),
    )
    const arg = mocks.bookingFindFirst.mock.calls[0][0] as {
      where: { OR: Array<{ customerEmail: string }> }
    }
    expect(arg.where.OR).toEqual([
      { customerEmail: 'jane@example.com' },
      { customerEmail: 'Jane@Example.com' },
    ])
  })

  it('returns null when booking is not found', async () => {
    mocks.bookingFindFirst.mockResolvedValue(null)
    const result = await getBookingByLookup({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(result).toBeNull()
  })

  it('returns a mock detail in dev-without-db only when seeds match', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const wrong = await getBookingByLookup({
      email: 'someone@else.com',
      confirmationCode: 'WRONG1',
    })
    expect(wrong).toBeNull()
    const right = await getBookingByLookup({
      email: 'jane@example.com',
      confirmationCode: 'mock01',
    })
    expect(right).not.toBeNull()
    expect(right?.cancellable).toBe(true)
  })

  it('computes refundIfCancelled = 0 when outside the window', async () => {
    mocks.getCancellationPolicyMock.mockReturnValue({
      windowHours: 24,
      refundPercent: 100,
    })
    mocks.bookingFindFirst.mockResolvedValue(
      bookingFixture({ startHoursFromNow: 2 }),
    )
    const result = await getBookingByLookup({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(result?.cancellable).toBe(true)
    expect(result?.refundIfCancelled).toBe(0)
  })

  it('computes partial refund based on policy percent', async () => {
    mocks.getCancellationPolicyMock.mockReturnValue({
      windowHours: 24,
      refundPercent: 50,
    })
    mocks.bookingFindFirst.mockResolvedValue(
      bookingFixture({ startHoursFromNow: 48, totalAmount: 5000 }),
    )
    const result = await getBookingByLookup({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(result?.refundIfCancelled).toBe(2500)
  })

  it('flags past bookings as not cancellable', async () => {
    mocks.bookingFindFirst.mockResolvedValue(
      bookingFixture({ startHoursFromNow: -2 }),
    )
    const result = await getBookingByLookup({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(result?.isPast).toBe(true)
    expect(result?.cancellable).toBe(false)
    expect(result?.refundIfCancelled).toBe(0)
  })
})

describe('cancelBookingAction', () => {
  it('rejects when the booking is not found', async () => {
    mocks.bookingFindFirst.mockResolvedValue(null)
    await expect(
      cancelBookingAction({
        email: 'x@y.co',
        confirmationCode: 'NOPE',
      }),
    ).rejects.toThrow(/could not find/i)
  })

  it('rejects already-cancelled bookings', async () => {
    mocks.bookingFindFirst.mockResolvedValue(
      bookingFixture({ status: 'CANCELLED' }),
    )
    await expect(
      cancelBookingAction({
        email: 'jane@example.com',
        confirmationCode: 'ABC123',
      }),
    ).rejects.toThrow(/already cancelled/i)
  })

  it('rejects past bookings', async () => {
    mocks.bookingFindFirst.mockResolvedValue(
      bookingFixture({ startHoursFromNow: -1 }),
    )
    await expect(
      cancelBookingAction({
        email: 'jane@example.com',
        confirmationCode: 'ABC123',
      }),
    ).rejects.toThrow(/past/i)
  })

  it('issues a Stripe refund when within window and PI exists', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      refundAmount: null,
      refundStatus: 'NONE',
      status: 'succeeded',
    })
    const result = await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: { status: 'CANCELLED', isRefunded: false },
    })
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: {
        stripeRefundId: 're_1',
        refundStatus: 'PENDING',
        refundAmount: 4500,
        refundReason: 'requested_by_customer',
      },
    })
    expect(mocks.createRefundMock).toHaveBeenCalledWith({
      paymentIntentId: 'pi_abc',
      amountCents: 4500,
      reason: 'requested_by_customer',
      idempotencyKey: 'customer-cancel:bk_1:4500',
      metadata: {
        bookingId: 'bk_1',
        source: 'customer_self_service',
      },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'BOOKING_CUSTOMER_CANCELLED',
      }),
    })
    expect(mocks.sendCancellationMock).toHaveBeenCalled()
    expect(result.refundAmountCents).toBe(4500)
    expect(result.refundPending).toBe(true)
  })

  it('does not cancel the booking if Stripe rejects the refund', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      refundAmount: null,
      refundStatus: 'NONE',
      status: 'succeeded',
    })
    mocks.createRefundMock.mockRejectedValue(new Error('stripe unavailable'))

    await expect(
      cancelBookingAction({
        email: 'jane@example.com',
        confirmationCode: 'ABC123',
      }),
    ).rejects.toThrow(/stripe unavailable/i)

    expect(mocks.txMock).not.toHaveBeenCalled()
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
    expect(mocks.paymentUpdate).not.toHaveBeenCalled()
  })

  it('rejects when a refund is already pending', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      refundAmount: null,
      refundStatus: 'PENDING',
      status: 'succeeded',
    })

    await expect(
      cancelBookingAction({
        email: 'jane@example.com',
        confirmationCode: 'ABC123',
      }),
    ).rejects.toThrow(/refund already in progress/i)

    expect(mocks.createRefundMock).not.toHaveBeenCalled()
    expect(mocks.txMock).not.toHaveBeenCalled()
  })

  it('skips Stripe refund + payment update when refund amount is 0', async () => {
    mocks.bookingFindFirst.mockResolvedValue(
      bookingFixture({ startHoursFromNow: 2 }), // inside the 24h window
    )
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      refundAmount: null,
      refundStatus: 'NONE',
      status: 'succeeded',
    })
    await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: { status: 'CANCELLED', isRefunded: false },
    })
    expect(mocks.createRefundMock).not.toHaveBeenCalled()
    expect(mocks.paymentUpdate).not.toHaveBeenCalled()
  })

  it('handles walk-ins (no stripePaymentIntentId) without calling Stripe', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: null,
      amount: 4500,
      status: 'cash',
    })
    const result = await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(mocks.createRefundMock).not.toHaveBeenCalled()
    expect(result.refundPending).toBe(false)
  })

  it('returns a mock result in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const result = await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'MOCK01',
    })
    expect(result.mocked).toBe(true)
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
  })
})
