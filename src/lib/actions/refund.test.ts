import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const paymentUpdateMock = vi.fn()
  const paymentUpdateManyMock = vi.fn()
  const bookingUpdateMock = vi.fn()
  const auditLogCreateMock = vi.fn()
  const prismaTxStub = {
    payment: { update: paymentUpdateMock, updateMany: paymentUpdateManyMock },
    booking: { update: bookingUpdateMock },
    auditLog: { create: auditLogCreateMock },
  }
  return {
    requireRoleMock: vi.fn(),
    createRefundMock: vi.fn(),
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    bookingFindUniqueMock: vi.fn(),
    paymentUpdateMock,
    paymentUpdateManyMock,
    bookingUpdateMock,
    auditLogCreateMock,
    transactionMock: vi.fn(
      async (fn: (tx: typeof prismaTxStub) => Promise<unknown>) =>
        fn(prismaTxStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({ requireRole: mocks.requireRoleMock }))
vi.mock('@/lib/stripe', () => ({ createRefund: mocks.createRefundMock }))
vi.mock('@/lib/env', () => ({ isDevWithoutDb: mocks.isDevWithoutDbMock }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findUnique: mocks.bookingFindUniqueMock },
    $transaction: mocks.transactionMock,
  },
}))

const {
  requireRoleMock,
  createRefundMock,
  isDevWithoutDbMock,
  bookingFindUniqueMock,
  paymentUpdateMock,
  paymentUpdateManyMock,
  bookingUpdateMock,
  auditLogCreateMock,
  revalidatePathMock,
} = mocks

import { manualRefundBookingAction, refundBookingAction } from './refund'

const baseBooking = {
  id: 'bk_1',
  tenantId: 't1',
  isRefunded: false,
  payment: {
    id: 'pay_1',
    stripePaymentIntentId: 'pi_1',
    amount: 5000,
    refundStatus: 'NONE',
  },
}

const baseWalkInBooking = {
  id: 'bk_walk',
  tenantId: 't1',
  isRefunded: false,
  status: 'CONFIRMED' as const,
  payment: {
    id: 'pay_w',
    stripePaymentIntentId: null,
    amount: 5000,
    refundStatus: 'NONE' as const,
    refundAmount: null as number | null,
  },
}

describe('refundBookingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isDevWithoutDbMock.mockReturnValue(false)
    requireRoleMock.mockResolvedValue({
      id: 'user_admin',
      role: 'ADMIN',
      tenantId: 't1',
    })
    bookingFindUniqueMock.mockResolvedValue(baseBooking)
    createRefundMock.mockResolvedValue({
      id: 're_1',
      status: 'pending',
      amount: 5000,
      mocked: false,
    })
  })

  it('requires MANAGER or ADMIN role', async () => {
    await refundBookingAction({ bookingId: 'bk_1' })
    expect(requireRoleMock).toHaveBeenCalledWith('MANAGER', 'ADMIN')
  })

  it('throws if booking already refunded', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseBooking,
      isRefunded: true,
    })
    await expect(refundBookingAction({ bookingId: 'bk_1' })).rejects.toThrow(
      /already.*refunded/i,
    )
  })

  it('throws if a refund is already pending', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseBooking,
      payment: { ...baseBooking.payment, refundStatus: 'PENDING' },
    })
    await expect(refundBookingAction({ bookingId: 'bk_1' })).rejects.toThrow(
      /in progress/i,
    )
  })

  it('throws if booking belongs to another tenant', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseBooking,
      tenantId: 'other',
    })
    await expect(refundBookingAction({ bookingId: 'bk_1' })).rejects.toThrow(
      'Booking not found',
    )
  })

  it('issues a full refund when amount is omitted', async () => {
    await refundBookingAction({ bookingId: 'bk_1' })
    expect(createRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 'pi_1',
        amountCents: 5000,
        idempotencyKey: 'booking-refund:bk_1:5000',
        metadata: expect.objectContaining({
          bookingId: 'bk_1',
          requestedBy: 'user_admin',
          cumulativeRefundAmount: '5000',
        }),
      }),
    )
  })

  it('clamps the requested amount to the payment total', async () => {
    await refundBookingAction({ bookingId: 'bk_1', amountCents: 99_999 })
    expect(createRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 5000 }),
    )
  })

  it('writes Payment.refundStatus=PENDING and an AuditLog row', async () => {
    await refundBookingAction({
      bookingId: 'bk_1',
      amountCents: 2500,
      reason: 'requested_by_customer',
      notes: 'guest left venue early',
    })
    expect(paymentUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'pay_1',
        NOT: {
          refundStatus: 'SUCCEEDED',
          refundAmount: { gte: 2500 },
        },
      },
      data: expect.objectContaining({
        stripeRefundId: 're_1',
        refundAmount: 2500,
        refundStatus: 'PENDING',
        refundedBy: 'user_admin',
        refundReason: 'guest left venue early',
      }),
    })
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'bk_1',
        userId: 'user_admin',
        action: 'BOOKING_REFUND_REQUESTED',
        entityType: 'Booking',
      }),
    })
  })

  it('does not flip Booking.isRefunded in the action (webhook owns that)', async () => {
    const result = await refundBookingAction({ bookingId: 'bk_1' })
    expect(result.status).toBe('PENDING')
    expect(bookingUpdateMock).not.toHaveBeenCalled()
  })

  it('allows a second partial refund after the first succeeded', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseBooking,
      isRefunded: false,
      payment: {
        ...baseBooking.payment,
        refundAmount: 2000,
        refundStatus: 'SUCCEEDED',
      },
    })
    createRefundMock.mockResolvedValue({
      id: 're_2',
      status: 'pending',
      amount: 1500,
      mocked: false,
    })
    await refundBookingAction({ bookingId: 'bk_1', amountCents: 1500 })
    expect(createRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 1500 }),
    )
    expect(paymentUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'pay_1',
        NOT: {
          refundStatus: 'SUCCEEDED',
          refundAmount: { gte: 3500 },
        },
      },
      data: expect.objectContaining({ refundAmount: 3500 }),
    })
  })

  it('throws when nothing remains to refund', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseBooking,
      isRefunded: true,
      payment: {
        ...baseBooking.payment,
        refundAmount: 5000,
        refundStatus: 'SUCCEEDED',
      },
    })
    await expect(refundBookingAction({ bookingId: 'bk_1' })).rejects.toThrow(
      /fully refunded/i,
    )
  })

  it('returns mocked result without DB calls when dev-without-db', async () => {
    isDevWithoutDbMock.mockReturnValue(true)
    const result = await refundBookingAction({
      bookingId: 'bk_1',
      amountCents: 1234,
    })
    expect(result.mocked).toBe(true)
    expect(result.amountCents).toBe(1234)
    expect(bookingFindUniqueMock).not.toHaveBeenCalled()
    expect(createRefundMock).not.toHaveBeenCalled()
  })
})

describe('manualRefundBookingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isDevWithoutDbMock.mockReturnValue(false)
    requireRoleMock.mockResolvedValue({
      id: 'user_mgr',
      role: 'MANAGER',
      tenantId: 't1',
    })
    bookingFindUniqueMock.mockResolvedValue(baseWalkInBooking)
  })

  it('requires MANAGER or ADMIN role', async () => {
    await manualRefundBookingAction({
      bookingId: 'bk_walk',
      amountCents: 100,
      method: 'cash',
    })
    expect(requireRoleMock).toHaveBeenCalledWith('MANAGER', 'ADMIN')
  })

  it('propagates when requireRole rejects (unauthenticated)', async () => {
    requireRoleMock.mockRejectedValueOnce(new Error('NEXT_REDIRECT'))
    await expect(
      manualRefundBookingAction({
        bookingId: 'bk_walk',
        amountCents: 100,
        method: 'cash',
      }),
    ).rejects.toThrow('NEXT_REDIRECT')
  })

  it('propagates when requireRole rejects (STAFF)', async () => {
    requireRoleMock.mockRejectedValueOnce(new Error('Unauthorized'))
    await expect(
      manualRefundBookingAction({
        bookingId: 'bk_walk',
        amountCents: 100,
        method: 'cash',
      }),
    ).rejects.toThrow('Unauthorized')
  })

  it('returns mocked result without prisma when dev-without-db', async () => {
    isDevWithoutDbMock.mockReturnValue(true)
    const result = await manualRefundBookingAction({
      bookingId: 'bk_walk',
      amountCents: 333,
      method: 'check',
    })
    expect(result).toEqual({
      amountCents: 333,
      method: 'check',
      mocked: true,
    })
    expect(bookingFindUniqueMock).not.toHaveBeenCalled()
    expect(mocks.transactionMock).not.toHaveBeenCalled()
  })

  it('throws if booking is not found', async () => {
    bookingFindUniqueMock.mockResolvedValue(null)
    await expect(
      manualRefundBookingAction({
        bookingId: 'missing',
        amountCents: 1,
        method: 'cash',
      }),
    ).rejects.toThrow('Booking not found')
  })

  it('throws if booking is already fully refunded', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseWalkInBooking,
      isRefunded: true,
    })
    await expect(
      manualRefundBookingAction({
        bookingId: 'bk_walk',
        amountCents: 1,
        method: 'cash',
      }),
    ).rejects.toThrow(/already.*refunded/i)
  })

  it('throws if payment used Stripe', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseWalkInBooking,
      payment: {
        ...baseWalkInBooking.payment,
        stripePaymentIntentId: 'pi_online',
      },
    })
    await expect(
      manualRefundBookingAction({
        bookingId: 'bk_walk',
        amountCents: 1,
        method: 'cash',
      }),
    ).rejects.toThrow('Use the Stripe refund flow for this booking')
  })

  it('throws when amountCents exceeds remaining refundable balance', async () => {
    await expect(
      manualRefundBookingAction({
        bookingId: 'bk_walk',
        amountCents: 5001,
        method: 'cash',
      }),
    ).rejects.toThrow(/between 1 and 5000/)
  })

  it('throws when amountCents is not positive', async () => {
    await expect(
      manualRefundBookingAction({
        bookingId: 'bk_walk',
        amountCents: 0,
        method: 'cash',
      }),
    ).rejects.toThrow(/at least 1 cent/)
  })

  it('throws when there is no payment row', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseWalkInBooking,
      payment: null,
    })
    await expect(
      manualRefundBookingAction({
        bookingId: 'bk_walk',
        amountCents: 1,
        method: 'cash',
      }),
    ).rejects.toThrow('No payment recorded for this booking')
  })

  it('full manual refund updates payment, cancels booking, and writes audit', async () => {
    await manualRefundBookingAction({
      bookingId: 'bk_walk',
      amountCents: 5000,
      method: 'cash',
      notes: 'guest cancelled',
    })
    expect(paymentUpdateMock).toHaveBeenCalledWith({
      where: { id: 'pay_w' },
      data: expect.objectContaining({
        refundAmount: 5000,
        refundStatus: 'SUCCEEDED',
        refundReason: 'guest cancelled',
        refundedBy: 'user_mgr',
        status: 'refunded_manual',
      }),
    })
    expect(bookingUpdateMock).toHaveBeenCalledWith({
      where: { id: 'bk_walk' },
      data: expect.objectContaining({
        isRefunded: true,
        status: 'CANCELLED',
      }),
    })
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'bk_walk',
        userId: 'user_mgr',
        action: 'BOOKING_MANUAL_REFUND',
        entityType: 'Booking',
        entityId: 'bk_walk',
        details: {
          method: 'cash',
          amount: 5000,
          notes: 'guest cancelled',
        },
      }),
    })
  })

  it('partial manual refund updates payment only; booking stays confirmed', async () => {
    await manualRefundBookingAction({
      bookingId: 'bk_walk',
      amountCents: 2500,
      method: 'check',
    })
    expect(paymentUpdateMock).toHaveBeenCalledWith({
      where: { id: 'pay_w' },
      data: expect.objectContaining({
        refundAmount: 2500,
        refundStatus: 'SUCCEEDED',
        status: 'refunded_manual',
      }),
    })
    expect(bookingUpdateMock).not.toHaveBeenCalled()
  })

  it('records method and notes on the audit log details', async () => {
    await manualRefundBookingAction({
      bookingId: 'bk_walk',
      amountCents: 100,
      method: 'other',
      notes: 'counter mistake',
    })
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: {
          method: 'other',
          amount: 100,
          notes: 'counter mistake',
        },
      }),
    })
  })

  it('revalidates staff booking detail and staff home', async () => {
    await manualRefundBookingAction({
      bookingId: 'bk_walk',
      amountCents: 1,
      method: 'comp',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/staff/bookings/bk_walk')
    expect(revalidatePathMock).toHaveBeenCalledWith('/staff')
  })
})
