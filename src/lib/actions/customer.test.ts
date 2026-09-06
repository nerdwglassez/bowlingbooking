import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const bookingUpdate = vi.fn()
  const paymentUpdate = vi.fn()
  const auditCreate = vi.fn()
  const bookingFindMany = vi.fn()
  const bookingHoldFindMany = vi.fn()
  const laneCount = vi.fn()
  const bookingLaneDeleteMany = vi.fn()
  const blockedSlotFindMany = vi.fn()
  const reassignBookingLanesMock = vi.fn()
  const txStub = {
    booking: { update: bookingUpdate, findFirst: vi.fn(), findMany: bookingFindMany },
    payment: { update: paymentUpdate },
    auditLog: { create: auditCreate },
    bookingHold: { findMany: bookingHoldFindMany },
    blockedSlot: { findMany: blockedSlotFindMany },
    lane: { count: laneCount },
    bookingLane: { deleteMany: bookingLaneDeleteMany },
  }
  return {
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    bookingFindFirst: vi.fn(),
    paymentFindUnique: vi.fn(),
    bookingUpdate,
    paymentUpdate,
    auditCreate,
    bookingFindMany,
    bookingHoldFindMany,
    laneCount,
    bookingLaneDeleteMany,
    blockedSlotFindMany,
    reassignBookingLanesMock,
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
vi.mock('@/lib/lane-assignment', () => ({
  reassignBookingLanes: mocks.reassignBookingLanesMock,
}))
vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn(async () => ({
    id: 'user_1',
    email: 'jane@example.com',
    role: 'CUSTOMER',
    tenantId: 't1',
  })),
}))

import {
  cancelBookingAction,
  getBookingByLookup,
  rescheduleDashboardBookingAction,
} from './customer'

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
    cancellationWindowHoursSnapshot: 24,
    rescheduleWindowHoursSnapshot: 24,
    bowlersPerLaneSnapshot: 6,
    cancellationRefundPercentSnapshot: 100,
    package: { name: 'Classic Bowling' },
    bowlers: [],
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
    cancellationWindowHours: 24,
    rescheduleWindowHours: 24,
    checkInWindowMinutes: 60,
    bowlersPerLane: 6,
    cancellationRefundPercent: 100,
    config: {},
  })
  mocks.sendCancellationMock.mockResolvedValue({ id: null })
  mocks.createRefundMock.mockResolvedValue({ id: 're_1', status: 'pending' })
  mocks.laneCount.mockResolvedValue(8)
  mocks.bookingFindMany.mockResolvedValue([])
  mocks.bookingHoldFindMany.mockResolvedValue([])
  mocks.blockedSlotFindMany.mockResolvedValue([])
  mocks.reassignBookingLanesMock.mockResolvedValue([1])
  mocks.txMock.mockImplementation(
    async (fn) => {
      const tx = {
        booking: {
          update: mocks.bookingUpdate,
          findFirst: mocks.bookingFindFirst,
          findMany: mocks.bookingFindMany,
        },
        payment: { update: mocks.paymentUpdate },
        auditLog: { create: mocks.auditCreate },
        bookingHold: { findMany: mocks.bookingHoldFindMany },
        blockedSlot: { findMany: mocks.blockedSlotFindMany },
        lane: { count: mocks.laneCount },
        bookingLane: { deleteMany: mocks.bookingLaneDeleteMany },
      }
      return fn(tx as Parameters<typeof fn>[0])
    },
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
    expect(result?.cancellable).toBe(false)
    expect(result?.refundIfCancelled).toBe(0)
  })

  it('computes partial refund based on policy percent', async () => {
    mocks.bookingFindFirst.mockResolvedValue({
      ...bookingFixture({ startHoursFromNow: 48, totalAmount: 5000 }),
      cancellationRefundPercentSnapshot: 50,
    })
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

  it('requests Stripe refund before cancelling locally when within window and PI exists', async () => {
    const callOrder: string[] = []
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      refundAmount: null,
      status: 'succeeded',
    })
    mocks.createRefundMock.mockImplementation(async () => {
      callOrder.push('refund')
      return { id: 're_1', status: 'pending', amount: 4500, mocked: false }
    })
    mocks.txMock.mockImplementation(async (fn) => {
      callOrder.push('transaction')
      return fn({
        booking: {
          update: mocks.bookingUpdate,
          findFirst: vi.fn(),
          findMany: mocks.bookingFindMany,
        },
        payment: { update: mocks.paymentUpdate },
        auditLog: { create: mocks.auditCreate },
        bookingHold: { findMany: mocks.bookingHoldFindMany },
        blockedSlot: { findMany: mocks.blockedSlotFindMany },
        lane: { count: mocks.laneCount },
        bookingLane: { deleteMany: mocks.bookingLaneDeleteMany },
      })
    })

    const result = await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })

    expect(callOrder).toEqual(['refund', 'transaction'])
    expect(mocks.createRefundMock).toHaveBeenCalledWith({
      paymentIntentId: 'pi_abc',
      amountCents: 4500,
      reason: 'requested_by_customer',
      idempotencyKey: 'customer-cancel-refund:bk_1:4500',
      metadata: {
        bookingId: 'bk_1',
        source: 'customer_self_service',
      },
    })
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: {
        status: 'CANCELLED',
        isRefunded: false,
        cancellationReason: 'CUSTOMER_REQUEST',
      },
    })
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: {
        stripeRefundId: 're_1',
        refundStatus: 'PENDING',
        refundAmount: 4500,
      },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'BOOKING_CUSTOMER_CANCELLED',
        details: expect.objectContaining({
          stripeRefundId: 're_1',
        }),
      }),
    })
    expect(mocks.sendCancellationMock).toHaveBeenCalled()
    expect(result.refundAmountCents).toBe(4500)
    expect(result.refundPending).toBe(true)
  })

  it('leaves booking, payment, and audit untouched when Stripe refund fails', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      refundAmount: null,
      status: 'succeeded',
    })
    mocks.createRefundMock.mockRejectedValue(new Error('Stripe unavailable'))

    await expect(
      cancelBookingAction({
        email: 'jane@example.com',
        confirmationCode: 'ABC123',
      }),
    ).rejects.toThrow(/Stripe unavailable/)

    expect(mocks.txMock).not.toHaveBeenCalled()
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
    expect(mocks.paymentUpdate).not.toHaveBeenCalled()
    expect(mocks.auditCreate).not.toHaveBeenCalled()
    expect(mocks.sendCancellationMock).not.toHaveBeenCalled()
  })

  it('rejects cancellation while a refund is already pending', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      status: 'succeeded',
      refundStatus: 'PENDING',
      refundAmount: 2000,
    })
    await expect(
      cancelBookingAction({
        email: 'jane@example.com',
        confirmationCode: 'ABC123',
      }),
    ).rejects.toThrow(/refund already in progress/i)
    expect(mocks.createRefundMock).not.toHaveBeenCalled()
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
  })

  it('does not issue a second policy refund after a settled partial cancel', async () => {
    mocks.bookingFindFirst.mockResolvedValue({
      ...bookingFixture({ totalAmount: 4500 }),
      cancellationRefundPercentSnapshot: 50,
    })
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      status: 'succeeded',
      refundStatus: 'SUCCEEDED',
      refundAmount: 2250,
    })

    const result = await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })

    expect(mocks.createRefundMock).not.toHaveBeenCalled()
    expect(mocks.paymentUpdate).not.toHaveBeenCalled()
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: {
        status: 'CANCELLED',
        isRefunded: false,
        cancellationReason: 'CUSTOMER_REQUEST',
      },
    })
    expect(result.refundAmountCents).toBe(0)
    expect(result.refundPending).toBe(false)
  })

  it('refunds only the remaining policy amount after a smaller staff partial', async () => {
    mocks.bookingFindFirst.mockResolvedValue({
      ...bookingFixture({ totalAmount: 4500 }),
      cancellationRefundPercentSnapshot: 50,
    })
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      status: 'succeeded',
      refundStatus: 'SUCCEEDED',
      refundAmount: 1000,
    })

    const result = await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })

    expect(mocks.createRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 1250,
        idempotencyKey: 'customer-cancel-refund:bk_1:2250',
      }),
    )
    expect(result.refundAmountCents).toBe(1250)
    expect(result.refundPending).toBe(true)
  })

  it('limits customer refunds to the remaining Stripe balance', async () => {
    mocks.bookingFindFirst.mockResolvedValue(bookingFixture())
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      stripePaymentIntentId: 'pi_abc',
      amount: 4500,
      status: 'succeeded',
      refundStatus: 'SUCCEEDED',
      refundAmount: 2000,
    })
    const result = await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(mocks.createRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 2500,
        idempotencyKey: 'customer-cancel-refund:bk_1:4500',
      }),
    )
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: {
        stripeRefundId: 're_1',
        refundStatus: 'PENDING',
        refundAmount: 4500,
      },
    })
    expect(result.refundAmountCents).toBe(2500)
    expect(result.refundPending).toBe(true)
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
      status: 'succeeded',
    })
    await cancelBookingAction({
      email: 'jane@example.com',
      confirmationCode: 'ABC123',
    })
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: {
        status: 'CANCELLED',
        isRefunded: false,
        cancellationReason: 'CUSTOMER_REQUEST',
      },
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

describe('rescheduleDashboardBookingAction', () => {
  it('reassigns lane links after updating booking times', async () => {
    const start = new Date(Date.now() + 48 * 3_600_000)
    const end = new Date(start.getTime() + 3_600_000)
    const newStart = new Date(start.getTime() + 24 * 3_600_000)
    const newEnd = new Date(newStart.getTime() + 3_600_000)

    mocks.bookingFindFirst
      .mockResolvedValueOnce({
        id: 'bk_1',
        tenantId: 't1',
        status: 'CONFIRMED',
        bowlerCount: 4,
        laneCount: 1,
        startTime: start,
        endTime: end,
        rescheduleWindowHoursSnapshot: 24,
        bowlersPerLaneSnapshot: 6,
      })
      .mockResolvedValueOnce({
        id: 'bk_1',
        tenantId: 't1',
        status: 'CONFIRMED',
        bowlerCount: 4,
        laneCount: 1,
        startTime: start,
        endTime: end,
      })

    await rescheduleDashboardBookingAction({
      bookingId: 'bk_1',
      startTime: newStart,
      endTime: newEnd,
    })

    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: {
        startTime: newStart,
        endTime: newEnd,
        laneCount: 1,
      },
    })
    expect(mocks.reassignBookingLanesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        bookingId: 'bk_1',
        tenantId: 't1',
        laneCount: 1,
        startTime: newStart,
        endTime: newEnd,
      }),
    )
  })

  it('allows rescheduling PENDING_PAYMENT bookings', async () => {
    const start = new Date(Date.now() + 48 * 3_600_000)
    const end = new Date(start.getTime() + 3_600_000)
    const newStart = new Date(start.getTime() + 24 * 3_600_000)
    const newEnd = new Date(newStart.getTime() + 3_600_000)

    mocks.bookingFindFirst.mockResolvedValue({
      id: 'bk_pending',
      tenantId: 't1',
      status: 'PENDING_PAYMENT',
      bowlerCount: 4,
      laneCount: 1,
      startTime: start,
      endTime: end,
      rescheduleWindowHoursSnapshot: 24,
      bowlersPerLaneSnapshot: 6,
    })

    await rescheduleDashboardBookingAction({
      bookingId: 'bk_pending',
      startTime: newStart,
      endTime: newEnd,
    })

    expect(mocks.reassignBookingLanesMock).toHaveBeenCalled()
  })

  it('keeps the original paid duration when the client sends a longer end', async () => {
    const start = new Date(Date.now() + 48 * 3_600_000)
    const end = new Date(start.getTime() + 3_600_000)
    const newStart = new Date(start.getTime() + 24 * 3_600_000)
    const stretchedEnd = new Date(newStart.getTime() + 4 * 3_600_000)
    const expectedEnd = new Date(newStart.getTime() + 3_600_000)

    mocks.bookingFindFirst.mockResolvedValue({
      id: 'bk_1',
      tenantId: 't1',
      status: 'CONFIRMED',
      isRefunded: false,
      bowlerCount: 4,
      laneCount: 1,
      startTime: start,
      endTime: end,
      rescheduleWindowHoursSnapshot: 24,
      bowlersPerLaneSnapshot: 6,
    })

    await rescheduleDashboardBookingAction({
      bookingId: 'bk_1',
      startTime: newStart,
      endTime: stretchedEnd,
    })

    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: {
        startTime: newStart,
        endTime: expectedEnd,
        laneCount: 1,
      },
    })
    expect(mocks.reassignBookingLanesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        startTime: newStart,
        endTime: expectedEnd,
      }),
    )
  })

  it('rejects a new start time in the past', async () => {
    const start = new Date(Date.now() + 48 * 3_600_000)
    const end = new Date(start.getTime() + 3_600_000)

    mocks.bookingFindFirst.mockResolvedValue({
      id: 'bk_1',
      tenantId: 't1',
      status: 'CONFIRMED',
      isRefunded: false,
      bowlerCount: 4,
      laneCount: 1,
      startTime: start,
      endTime: end,
      rescheduleWindowHoursSnapshot: 24,
      bowlersPerLaneSnapshot: 6,
    })

    await expect(
      rescheduleDashboardBookingAction({
        bookingId: 'bk_1',
        startTime: new Date(Date.now() - 3_600_000),
        endTime: new Date(Date.now()),
      }),
    ).rejects.toThrow(/future/i)
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
  })
})
