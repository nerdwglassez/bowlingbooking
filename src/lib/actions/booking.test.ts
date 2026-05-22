import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tenantFindUnique = vi.fn()
  const bookingHoldCreate = vi.fn()
  const bookingHoldFindUnique = vi.fn()
  const bookingHoldDeleteMany = vi.fn()
  const bookingFindMany = vi.fn()
  const bookingHoldFindMany = vi.fn()
  const laneCount = vi.fn()
  const packageFindFirst = vi.fn()

  const makeTx = () => ({
    tenant: { findUnique: tenantFindUnique },
    bookingHold: {
      create: bookingHoldCreate,
      findMany: bookingHoldFindMany,
      deleteMany: bookingHoldDeleteMany,
    },
    booking: { findMany: bookingFindMany },
    lane: { count: laneCount },
    package: { findFirst: packageFindFirst },
  })

  return {
    isDevWithoutDbMock: vi.fn(() => false),
    createPaymentIntentMock: vi.fn(),
    isStripeMockedMock: vi.fn(() => false),
    tenantFindUnique,
    bookingHoldCreate,
    bookingHoldFindUnique,
    bookingHoldDeleteMany,
    bookingFindMany,
    bookingHoldFindMany,
    laneCount,
    packageFindMany: vi.fn(),
    packageFindFirst,
    makeTx,
    transactionMock: vi.fn(),
  }
})

vi.mock('@/lib/env', () => ({ isDevWithoutDb: mocks.isDevWithoutDbMock }))
vi.mock('@/lib/stripe', () => ({
  createPaymentIntent: mocks.createPaymentIntentMock,
  isStripeMocked: mocks.isStripeMockedMock,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: mocks.tenantFindUnique },
    bookingHold: {
      create: mocks.bookingHoldCreate,
      findUnique: mocks.bookingHoldFindUnique,
      deleteMany: mocks.bookingHoldDeleteMany,
      findMany: mocks.bookingHoldFindMany,
    },
    booking: { findMany: mocks.bookingFindMany },
    lane: { count: mocks.laneCount },
    $transaction: mocks.transactionMock,
    package: {
      findMany: mocks.packageFindMany,
      findFirst: mocks.packageFindFirst,
    },
  },
}))

import {
  acquireBookingHold,
  confirmBooking,
  getAvailableTimeSlots,
  getPackagesForTenant,
  releaseBookingHold,
} from './booking'

beforeEach(() => {
  Object.values(mocks).forEach((m) => {
    if (typeof m === 'function' && 'mockReset' in m) {
      ;(m as ReturnType<typeof vi.fn>).mockReset()
    }
  })
  mocks.isDevWithoutDbMock.mockReturnValue(false)
  mocks.isStripeMockedMock.mockReturnValue(false)
  mocks.tenantFindUnique.mockResolvedValue({
    holdTimeoutMins: 10,
    maxOnlineBowlers: 18,
  })
  mocks.laneCount.mockResolvedValue(8)
  mocks.bookingFindMany.mockResolvedValue([])
  mocks.bookingHoldFindMany.mockResolvedValue([])
  mocks.transactionMock.mockImplementation(
    async (
      fn: (tx: ReturnType<typeof mocks.makeTx>) => Promise<unknown>,
    ) => fn(mocks.makeTx()),
  )
})

describe('acquireBookingHold', () => {
  it('returns mock holdId without touching prisma in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const result = await acquireBookingHold({
      tenantId: 't1',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3_600_000),
      bowlerCount: 6,
    })
    expect(result.holdId.startsWith('hold_mock_')).toBe(true)
    expect(result.expiresAt).toBeInstanceOf(Date)
    expect(mocks.bookingHoldCreate).not.toHaveBeenCalled()
  })

  it('creates a BookingHold row with the tenant hold timeout', async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      holdTimeoutMins: 7,
      maxOnlineBowlers: 18,
    })
    const expiresAt = new Date(Date.now() + 7 * 60_000)
    mocks.bookingHoldCreate.mockResolvedValue({ id: 'h1', expiresAt })

    const startTime = new Date('2026-01-01T18:00:00Z')
    const endTime = new Date('2026-01-01T19:00:00Z')
    const result = await acquireBookingHold({
      tenantId: 't1',
      startTime,
      endTime,
      bowlerCount: 12,
    })

    expect(result.holdId).toBe('h1')
    expect(mocks.transactionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    )
    expect(mocks.bookingHoldCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        startTime,
        endTime,
        bowlerCount: 12,
        laneCount: 2,
      }),
      select: { id: true, expiresAt: true },
    })
  })

  it('rejects a hold when overlapping reservations fill the slot capacity', async () => {
    mocks.laneCount.mockResolvedValue(2)
    mocks.bookingFindMany.mockResolvedValue([
      {
        startTime: new Date('2026-01-01T18:00:00Z'),
        endTime: new Date('2026-01-01T19:00:00Z'),
        laneCount: 1,
      },
    ])
    mocks.bookingHoldFindMany.mockResolvedValue([
      {
        startTime: new Date('2026-01-01T18:00:00Z'),
        endTime: new Date('2026-01-01T19:00:00Z'),
        laneCount: 1,
      },
    ])

    await expect(
      acquireBookingHold({
        tenantId: 't1',
        startTime: new Date('2026-01-01T18:00:00Z'),
        endTime: new Date('2026-01-01T19:00:00Z'),
        bowlerCount: 6,
      }),
    ).rejects.toThrow(/no longer available/i)
    expect(mocks.bookingHoldCreate).not.toHaveBeenCalled()
  })

  it('retries serializable transaction conflicts before creating the hold', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60_000)
    mocks.bookingHoldCreate.mockResolvedValue({ id: 'h1', expiresAt })
    mocks.transactionMock
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockImplementationOnce(
        async (
          fn: (tx: ReturnType<typeof mocks.makeTx>) => Promise<unknown>,
        ) => fn(mocks.makeTx()),
      )

    const result = await acquireBookingHold({
      tenantId: 't1',
      startTime: new Date('2026-01-01T18:00:00Z'),
      endTime: new Date('2026-01-01T19:00:00Z'),
      bowlerCount: 6,
    })

    expect(result.holdId).toBe('h1')
    expect(mocks.transactionMock).toHaveBeenCalledTimes(2)
  })

  it('throws if tenant is not found', async () => {
    mocks.tenantFindUnique.mockResolvedValue(null)
    await expect(
      acquireBookingHold({
        tenantId: 'missing',
        startTime: new Date('2026-01-01T18:00:00Z'),
        endTime: new Date('2026-01-01T19:00:00Z'),
        bowlerCount: 1,
      }),
    ).rejects.toThrow(/Tenant not found/i)
  })
})

describe('releaseBookingHold', () => {
  it('is a no-op in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    await releaseBookingHold('hold_real_123')
    expect(mocks.bookingHoldDeleteMany).not.toHaveBeenCalled()
  })

  it('skips blank ids without hitting the DB', async () => {
    await releaseBookingHold('  ')
    expect(mocks.bookingHoldDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes a real Prisma hold row by id', async () => {
    await releaseBookingHold('cmabc123hold')
    expect(mocks.bookingHoldDeleteMany).toHaveBeenCalledWith({
      where: { id: 'cmabc123hold' },
    })
  })
})

describe('getAvailableTimeSlots', () => {
  it('returns mock slots untouched in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const slots = await getAvailableTimeSlots('t1', '2026-01-01', 6)
    expect(slots.length).toBe(8)
    expect(slots.every((s) => s.available)).toBe(true)
    expect(mocks.bookingHoldDeleteMany).not.toHaveBeenCalled()
    expect(mocks.bookingFindMany).not.toHaveBeenCalled()
  })

  it('cleans up expired holds before computing availability', async () => {
    mocks.laneCount.mockResolvedValue(8)
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    await getAvailableTimeSlots('t1', '2026-01-01', 6)
    expect(mocks.bookingHoldDeleteMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', expiresAt: { lt: expect.any(Date) } },
    })
  })

  it('marks a slot unavailable when confirmed bookings + holds exceed capacity', async () => {
    mocks.laneCount.mockResolvedValue(2)
    mocks.bookingFindMany.mockResolvedValue([
      {
        startTime: new Date('2026-01-01T18:00:00'),
        endTime: new Date('2026-01-01T19:00:00'),
        laneCount: 1,
      },
    ])
    mocks.bookingHoldFindMany.mockResolvedValue([
      {
        startTime: new Date('2026-01-01T18:00:00'),
        endTime: new Date('2026-01-01T19:00:00'),
        laneCount: 1,
      },
    ])
    const slots = await getAvailableTimeSlots('t1', '2026-01-01', 6)
    const occupied = slots.find((s) => s.id === '2026-01-01-18')
    const free = slots.find((s) => s.id === '2026-01-01-20')
    expect(occupied?.available).toBe(false)
    expect(free?.available).toBe(true)
  })
})

describe('confirmBooking', () => {
  const startTime = new Date('2026-02-01T18:00:00Z')
  const endTime = new Date('2026-02-01T19:00:00Z')

  beforeEach(() => {
    mocks.bookingHoldFindUnique.mockResolvedValue({
      id: 'h1',
      tenantId: 't1',
      startTime,
      endTime,
      bowlerCount: 4,
      laneCount: 1,
      expiresAt: new Date(Date.now() + 60_000),
    })
    mocks.packageFindFirst.mockResolvedValue({
      id: 'pkg_classic',
      tenantId: 't1',
      name: 'Classic Bowling',
      description: null,
      basePrice: 4500,
      gameIncluded: true,
      shoesIncluded: true,
      gameCostPer: null,
      shoeCostPer: null,
      partyTypes: ['OPEN'],
      active: true,
      sortOrder: 1,
    })
    mocks.createPaymentIntentMock.mockResolvedValue({
      id: 'pi_1',
      clientSecret: 'pi_1_secret_x',
      amount: 4500,
      status: 'requires_payment_method',
      mocked: false,
    })
  })

  it('rejects non-positive totals', async () => {
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg',
        partyType: 'OPEN',
        bowlerCount: 1,
        startTime: new Date(),
        endTime: new Date(),
        totalAmount: 0,
        customerName: 'a',
        customerEmail: 'a@b.co',
        customerPhone: '',
      }),
    ).rejects.toThrow(/totalAmount/i)
  })

  it('rejects expired holds', async () => {
    mocks.bookingHoldFindUnique.mockResolvedValue({
      id: 'h1',
      tenantId: 't1',
      startTime,
      endTime,
      bowlerCount: 4,
      laneCount: 1,
      expiresAt: new Date(Date.now() - 60_000),
    })
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg_classic',
        partyType: 'OPEN',
        bowlerCount: 4,
        startTime,
        endTime,
        totalAmount: 4500,
        customerName: 'a',
        customerEmail: 'a@b.co',
        customerPhone: '',
      }),
    ).rejects.toThrow(/expired/i)
  })

  it('uses verified hold and package pricing for PaymentIntent metadata', async () => {
    await confirmBooking({
      tenantId: 't1',
      holdId: 'h1',
      packageId: 'pkg_classic',
      partyType: 'OPEN',
      bowlerCount: 4,
      startTime,
      endTime,
      totalAmount: 4500,
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      customerPhone: '555',
    })
    expect(mocks.packageFindFirst).toHaveBeenCalledWith({
      where: { id: 'pkg_classic', tenantId: 't1', active: true },
    })
    expect(mocks.createPaymentIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 4500,
        customerEmail: 'jane@example.com',
        metadata: expect.objectContaining({
          holdId: 'h1',
          tenantId: 't1',
          packageId: 'pkg_classic',
          bowlerCount: '4',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          customerName: 'Jane',
        }),
      }),
    )
  })

  it('rejects a client total that does not match server-side pricing', async () => {
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg_classic',
        partyType: 'OPEN',
        bowlerCount: 4,
        startTime,
        endTime,
        totalAmount: 100,
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
        customerPhone: '555',
      }),
    ).rejects.toThrow(/total changed/i)
    expect(mocks.createPaymentIntentMock).not.toHaveBeenCalled()
  })

  it('rejects booking inputs that do not match the live hold', async () => {
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg_classic',
        partyType: 'OPEN',
        bowlerCount: 6,
        startTime,
        endTime,
        totalAmount: 4500,
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
        customerPhone: '555',
      }),
    ).rejects.toThrow(/hold no longer matches/i)
    expect(mocks.createPaymentIntentMock).not.toHaveBeenCalled()
  })
})

describe('getPackagesForTenant', () => {
  it('returns mock packages in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const pkgs = await getPackagesForTenant('t1')
    expect(pkgs.length).toBeGreaterThan(0)
    expect(mocks.packageFindMany).not.toHaveBeenCalled()
  })

  it('queries Prisma for active packages with stable sort', async () => {
    mocks.packageFindMany.mockResolvedValue([])
    await getPackagesForTenant('t1')
    expect(mocks.packageFindMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', active: true },
      orderBy: { sortOrder: 'asc' },
    })
  })
})
