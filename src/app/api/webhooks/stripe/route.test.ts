import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const stripeEventCreate = vi.fn()
  const stripeEventDeleteMany = vi.fn()
  const bookingCreate = vi.fn()
  const paymentCreate = vi.fn()
  const paymentFindUnique = vi.fn()
  const paymentUpdate = vi.fn()
  const bookingUpdate = vi.fn()
  const bookingFindMany = vi.fn()
  const bookingHoldDeleteMany = vi.fn()
  const bookingHoldFindUnique = vi.fn()
  const bookingHoldFindMany = vi.fn()
  const laneCount = vi.fn()
  const promoFindUnique = vi.fn()
  const promoUpdate = vi.fn()
  const auditCreate = vi.fn()
  const tenantFindUniqueOrThrow = vi.fn()
  const claimTokenCreate = vi.fn()
  const bookingBowlerCreateMany = vi.fn()
  const laneFindMany = vi.fn()
  const bookingLaneCreate = vi.fn()
  const packageFindFirst = vi.fn()

  const txStub = {
    booking: {
      create: bookingCreate,
      update: bookingUpdate,
      findMany: bookingFindMany,
    },
    payment: { create: paymentCreate, update: paymentUpdate },
    bookingHold: {
      deleteMany: bookingHoldDeleteMany,
      findUnique: bookingHoldFindUnique,
      findMany: bookingHoldFindMany,
    },
    lane: { count: laneCount, findMany: laneFindMany },
    promoCode: { findUnique: promoFindUnique, update: promoUpdate },
    auditLog: { create: auditCreate },
    tenant: { findUniqueOrThrow: tenantFindUniqueOrThrow },
    claimToken: { create: claimTokenCreate },
    bookingBowler: { createMany: bookingBowlerCreateMany },
    bookingLane: { create: bookingLaneCreate },
  }

  return {
    stripeEventCreate,
    stripeEventDeleteMany,
    bookingCreate,
    paymentCreate,
    paymentFindUnique,
    paymentUpdate,
    bookingUpdate,
    bookingFindMany,
    bookingHoldDeleteMany,
    bookingHoldFindUnique,
    bookingHoldFindMany,
    laneCount,
    laneFindMany,
    bookingLaneCreate,
    tenantFindUniqueOrThrow,
    claimTokenCreate,
    bookingBowlerCreateMany,
    packageFindFirst,
    promoFindUnique,
    promoUpdate,
    auditCreate,
    constructWebhookEventMock: vi.fn(),
    isDevWithoutDbMock: vi.fn(() => false),
    getTenantMock: vi.fn(async () => ({
      id: 't1',
      name: 'Royal Z Lanes',
      address: '1 Main',
      phone: '555-0100',
      config: {},
    })),
    sendEmailMock: vi.fn(async () => ({ id: 'email_1' })),
    transactionMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeEvent: {
      create: mocks.stripeEventCreate,
      deleteMany: mocks.stripeEventDeleteMany,
    },
    payment: { findUnique: mocks.paymentFindUnique },
    package: { findFirst: mocks.packageFindFirst },
    $transaction: mocks.transactionMock,
  },
}))
vi.mock('@/lib/stripe', () => ({
  constructWebhookEvent: mocks.constructWebhookEventMock,
}))
vi.mock('@/lib/env', () => ({ isDevWithoutDb: mocks.isDevWithoutDbMock }))
vi.mock('@/lib/tenant', () => ({
  getTenant: mocks.getTenantMock,
  getContactEmail: vi.fn(() => null),
}))
vi.mock('@/lib/email', () => ({ sendBookingConfirmation: mocks.sendEmailMock }))

import { POST } from './route'

function makeRequest(body: string, signature: string | null = 'sig'): Request {
  const headers = new Headers()
  if (signature) headers.set('stripe-signature', signature)
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  })
}

const validMetadata = {
  holdId: 'hold_1',
  tenantId: 't1',
  packageId: 'pkg_classic',
  partyType: 'OPEN',
  bowlerCount: '6',
  laneCount: '1',
  bowlersPerLane: '6',
  startTime: '2025-06-01T18:00:00.000Z',
  endTime: '2025-06-01T19:00:00.000Z',
  customerName: 'Jane Doe',
  customerEmail: 'jane@example.com',
  customerPhone: '555-1234',
}

const paymentIntentEvent = {
  id: 'evt_1',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_1',
      amount: 4500,
      status: 'succeeded',
      metadata: validMetadata,
    },
  },
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => {
    if (typeof m === 'function' && 'mockReset' in m) {
      ;(m as ReturnType<typeof vi.fn>).mockReset()
    }
  })
  mocks.isDevWithoutDbMock.mockReturnValue(false)
  mocks.getTenantMock.mockResolvedValue({
    id: 't1',
    name: 'Royal Z Lanes',
    address: '1 Main',
    phone: '555-0100',
    config: {},
  })
  mocks.transactionMock.mockImplementation(
    async (fn) =>
      fn({
        booking: {
          create: mocks.bookingCreate,
          update: mocks.bookingUpdate,
          findMany: mocks.bookingFindMany,
        },
        payment: { create: mocks.paymentCreate, update: mocks.paymentUpdate },
        bookingHold: {
          deleteMany: mocks.bookingHoldDeleteMany,
          findUnique: mocks.bookingHoldFindUnique,
          findMany: mocks.bookingHoldFindMany,
        },
        lane: { count: mocks.laneCount, findMany: mocks.laneFindMany },
        promoCode: {
          findUnique: mocks.promoFindUnique,
          update: mocks.promoUpdate,
        },
        auditLog: { create: mocks.auditCreate },
        tenant: { findUniqueOrThrow: mocks.tenantFindUniqueOrThrow },
        claimToken: { create: mocks.claimTokenCreate },
        bookingBowler: { createMany: mocks.bookingBowlerCreateMany },
        bookingLane: { create: mocks.bookingLaneCreate },
      } as Parameters<typeof fn>[0]),
  )
  mocks.laneCount.mockResolvedValue(8)
  mocks.laneFindMany.mockResolvedValue([
    { id: 'lane_1', number: 1 },
    { id: 'lane_2', number: 2 },
    { id: 'lane_3', number: 3 },
  ])
  mocks.tenantFindUniqueOrThrow.mockResolvedValue({
    id: 't1',
    cancellationWindowHours: 24,
    rescheduleWindowHours: 24,
    bowlersPerLane: 6,
    cancellationRefundPercent: 100,
    config: {},
  })
  mocks.claimTokenCreate.mockResolvedValue({ id: 'claim_1' })
  mocks.bookingBowlerCreateMany.mockResolvedValue({ count: 0 })
  mocks.bookingLaneCreate.mockResolvedValue({})
  mocks.packageFindFirst.mockResolvedValue({ name: 'Classic Bowling' })
  mocks.bookingFindMany.mockResolvedValue([])
  mocks.bookingHoldFindMany.mockResolvedValue([])
  mocks.bookingHoldFindUnique.mockResolvedValue(null)
  mocks.stripeEventDeleteMany.mockResolvedValue({ count: 1 })
  mocks.promoFindUnique.mockResolvedValue(null)
  mocks.bookingCreate.mockResolvedValue({
    id: 'bk_1',
    confirmationCode: 'ABC123',
    startTime: new Date('2025-06-01T18:00:00Z'),
    endTime: new Date('2025-06-01T19:00:00Z'),
    bowlerCount: 6,
    laneCount: 1,
    customerEmail: 'jane@example.com',
    totalAmount: 4500,
  })
  mocks.sendEmailMock.mockResolvedValue({ id: 'email_1' })
})

describe('POST /api/webhooks/stripe', () => {
  it('returns 400 if signature verification throws', async () => {
    mocks.constructWebhookEventMock.mockImplementation(() => {
      throw new Error('bad sig')
    })
    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(400)
  })

  it('returns mocked:true and skips DB when isDevWithoutDb', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    mocks.constructWebhookEventMock.mockReturnValue(paymentIntentEvent)
    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ received: true, mocked: true })
    expect(mocks.stripeEventCreate).not.toHaveBeenCalled()
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
  })

  it('records the Stripe event and creates a Booking + Payment + deletes hold', async () => {
    mocks.constructWebhookEventMock.mockReturnValue(paymentIntentEvent)
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.stripeEventCreate).toHaveBeenCalledOnce()
    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        packageId: 'pkg_classic',
        status: 'CONFIRMED',
        source: 'ONLINE',
        bowlerCount: 6,
        laneCount: 1,
        totalAmount: 4500,
        discountAmount: 0,
        promoCodeId: null,
        customerEmail: 'jane@example.com',
      }),
    })
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'bk_1',
        stripePaymentIntentId: 'pi_1',
        amount: 4500,
        status: 'succeeded',
      }),
    })
    expect(mocks.bookingHoldDeleteMany).toHaveBeenCalledWith({
      where: { id: 'hold_1' },
    })
    expect(mocks.sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'jane@example.com' }),
    )
  })

  it('uses metadata laneCount snapshot instead of recomputing from bowlersPerLane', async () => {
    const evt = {
      id: 'evt_lane_snap',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_lane',
          amount: 4500,
          status: 'succeeded',
          metadata: {
            ...validMetadata,
            bowlerCount: '13',
            laneCount: '1',
            bowlersPerLane: '6',
          },
        },
      },
    }
    mocks.constructWebhookEventMock.mockReturnValue(evt)
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue(null)

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bowlerCount: 13,
        laneCount: 1,
      }),
    })
  })

  it('falls back to live hold laneCount when metadata omits laneCount', async () => {
    const { laneCount: _laneCount, ...legacyMetadata } = validMetadata
    const evt = {
      id: 'evt_lane_hold',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_hold_lane',
          amount: 4500,
          status: 'succeeded',
          metadata: legacyMetadata,
        },
      },
    }
    mocks.constructWebhookEventMock.mockReturnValue(evt)
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue(null)
    mocks.bookingHoldFindUnique.mockResolvedValue({
      id: 'hold_1',
      tenantId: 't1',
      bowlerCount: 6,
      laneCount: 2,
      startTime: new Date(validMetadata.startTime),
      endTime: new Date(validMetadata.endTime),
    })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ laneCount: 2 }),
    })
  })

  it('links valid promo, increments uses, and writes BOOKING_PROMO_APPLIED audit', async () => {
    const meta = {
      ...validMetadata,
      promoCode: 'summer',
      discountCents: '500',
    }
    const evt = {
      id: 'evt_promo',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_promo',
          amount: 4000,
          status: 'succeeded',
          metadata: meta,
        },
      },
    }
    mocks.constructWebhookEventMock.mockReturnValue(evt)
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue(null)
    mocks.promoFindUnique.mockResolvedValue({
      id: 'promo_1',
      active: true,
      expiresAt: null,
      maxUses: null,
      usesCount: 0,
    })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalAmount: 4000,
        discountAmount: 500,
        promoCodeId: 'promo_1',
      }),
    })
    expect(mocks.promoUpdate).toHaveBeenCalledWith({
      where: { id: 'promo_1' },
      data: { usesCount: { increment: 1 } },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'BOOKING_PROMO_APPLIED' }),
    })
  })

  it('returns duplicate:true on Stripe event re-delivery', async () => {
    mocks.constructWebhookEventMock.mockReturnValue(paymentIntentEvent)
    mocks.stripeEventCreate.mockRejectedValue({ code: 'P2002' })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ received: true, duplicate: true })
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
  })

  it('retries finalize when confirmation_code collides (P2002)', async () => {
    mocks.constructWebhookEventMock.mockReturnValue(paymentIntentEvent)
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue(null)
    mocks.bookingCreate
      .mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['confirmation_code'] },
      })
      .mockResolvedValueOnce({
        id: 'bk_1',
        confirmationCode: 'XYZ789',
        startTime: new Date('2025-06-01T18:00:00Z'),
        endTime: new Date('2025-06-01T19:00:00Z'),
        bowlerCount: 6,
        laneCount: 1,
        customerEmail: 'jane@example.com',
        totalAmount: 4500,
      })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.transactionMock).toHaveBeenCalledTimes(2)
    expect(mocks.bookingCreate).toHaveBeenCalledTimes(2)
  })

  it('clears the event marker when payment-intent processing fails so Stripe can retry', async () => {
    mocks.constructWebhookEventMock.mockReturnValue(paymentIntentEvent)
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue(null)
    mocks.bookingCreate.mockRejectedValue(new Error('database unavailable'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest('{}') as never)

    expect(res.status).toBe(500)
    expect(mocks.stripeEventDeleteMany).toHaveBeenCalledWith({
      where: { id: 'evt_1' },
    })
    err.mockRestore()
  })

  it('skips Booking creation when a Payment row already exists for the intent', async () => {
    mocks.constructWebhookEventMock.mockReturnValue(paymentIntentEvent)
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue({ id: 'pay_existing' })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
  })

  it('returns 200 but skips processing on malformed metadata', async () => {
    mocks.constructWebhookEventMock.mockReturnValue({
      id: 'evt_2',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_2', amount: 100, metadata: { foo: 'bar' } } },
    })
    mocks.stripeEventCreate.mockResolvedValue({})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('reconciles refund status on charge.refunded', async () => {
    mocks.constructWebhookEventMock.mockReturnValue({
      id: 'evt_refund_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_1',
          payment_intent: 'pi_1',
          amount_refunded: 4500,
          refunded: true,
        },
      },
    })
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      amount: 4500,
      stripePaymentIntentId: 'pi_1',
      booking: { status: 'CONFIRMED' },
    })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        refundAmount: 4500,
        refundStatus: 'SUCCEEDED',
      }),
    })
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: expect.objectContaining({
        isRefunded: true,
        status: 'CANCELLED',
      }),
    })
  })

  it('partial charge.refunded updates payment but leaves booking active', async () => {
    mocks.constructWebhookEventMock.mockReturnValue({
      id: 'evt_refund_partial',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_2',
          payment_intent: 'pi_1',
          amount_refunded: 2000,
          refunded: true,
        },
      },
    })
    mocks.stripeEventCreate.mockResolvedValue({})
    mocks.paymentFindUnique.mockResolvedValue({
      id: 'pay_1',
      bookingId: 'bk_1',
      amount: 4500,
      stripePaymentIntentId: 'pi_1',
      booking: { status: 'CONFIRMED' },
    })

    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
    expect(mocks.paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        refundAmount: 2000,
        refundStatus: 'SUCCEEDED',
      }),
    })
  })

  it('ignores unknown event types but still returns 200', async () => {
    mocks.constructWebhookEventMock.mockReturnValue({
      id: 'evt_x',
      type: 'customer.created',
      data: { object: {} },
    })
    mocks.stripeEventCreate.mockResolvedValue({})
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const res = await POST(makeRequest('{}') as never)
    expect(res.status).toBe(200)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
