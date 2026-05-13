import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isDevWithoutDbMock: vi.fn(() => false),
  createPaymentIntentMock: vi.fn(),
  isStripeMockedMock: vi.fn(() => false),
  tenantFindUnique: vi.fn(),
  bookingHoldCreate: vi.fn(),
  bookingHoldFindUnique: vi.fn(),
  bookingHoldDeleteMany: vi.fn(),
  bookingFindMany: vi.fn(),
  bookingHoldFindMany: vi.fn(),
  laneCount: vi.fn(),
  packageFindMany: vi.fn(),
}))

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
    package: { findMany: mocks.packageFindMany },
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
    mocks.tenantFindUnique.mockResolvedValue({ holdTimeoutMins: 7 })
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

  it('throws if tenant is not found', async () => {
    mocks.tenantFindUnique.mockResolvedValue(null)
    await expect(
      acquireBookingHold({
        tenantId: 'missing',
        startTime: new Date(),
        endTime: new Date(),
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

  it('skips mock-shaped ids without hitting the DB', async () => {
    await releaseBookingHold('not-a-hold-id')
    expect(mocks.bookingHoldDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes the hold row by id', async () => {
    await releaseBookingHold('hold_xyz')
    expect(mocks.bookingHoldDeleteMany).toHaveBeenCalledWith({
      where: { id: 'hold_xyz' },
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
  beforeEach(() => {
    mocks.bookingHoldFindUnique.mockResolvedValue({
      id: 'h1',
      expiresAt: new Date(Date.now() + 60_000),
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
      expiresAt: new Date(Date.now() - 60_000),
    })
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg',
        partyType: 'OPEN',
        bowlerCount: 1,
        startTime: new Date(),
        endTime: new Date(),
        totalAmount: 100,
        customerName: 'a',
        customerEmail: 'a@b.co',
        customerPhone: '',
      }),
    ).rejects.toThrow(/expired/i)
  })

  it('embeds booking inputs in PaymentIntent metadata', async () => {
    const startTime = new Date('2026-02-01T18:00:00Z')
    const endTime = new Date('2026-02-01T19:00:00Z')
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
