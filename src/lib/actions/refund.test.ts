import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const paymentUpdateMock = vi.fn()
  const auditLogCreateMock = vi.fn()
  const prismaTxStub = {
    payment: { update: paymentUpdateMock },
    auditLog: { create: auditLogCreateMock },
  }
  return {
    requireRoleMock: vi.fn(),
    createRefundMock: vi.fn(),
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    bookingFindUniqueMock: vi.fn(),
    paymentUpdateMock,
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
  auditLogCreateMock,
} = mocks

import { refundBookingAction } from './refund'

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

  it('throws if the booking belongs to another tenant', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseBooking,
      tenantId: 't2',
    })
    await expect(refundBookingAction({ bookingId: 'bk_1' })).rejects.toThrow(
      /not found/i,
    )
    expect(createRefundMock).not.toHaveBeenCalled()
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

  it('throws if a refund already settled for this booking', async () => {
    bookingFindUniqueMock.mockResolvedValue({
      ...baseBooking,
      payment: { ...baseBooking.payment, refundStatus: 'SUCCEEDED' },
    })
    await expect(refundBookingAction({ bookingId: 'bk_1' })).rejects.toThrow(
      /settled refund/i,
    )
    expect(createRefundMock).not.toHaveBeenCalled()
  })

  it('issues a full refund when amount is omitted', async () => {
    await refundBookingAction({ bookingId: 'bk_1' })
    expect(createRefundMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: 'pi_1',
        amountCents: 5000,
        metadata: expect.objectContaining({
          bookingId: 'bk_1',
          requestedBy: 'user_admin',
        }),
        idempotencyKey: 'booking-refund:bk_1',
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
    expect(paymentUpdateMock).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
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
    await refundBookingAction({ bookingId: 'bk_1' })
    const result = await refundBookingAction({ bookingId: 'bk_1' })
    expect(result.status).toBe('PENDING')
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
