import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const bookingCreate = vi.fn()
  const paymentCreate = vi.fn()
  const auditCreate = vi.fn()
  const bookingFindMany = vi.fn()
  const laneCount = vi.fn()
  const bookingHoldFindMany = vi.fn()
  const blockCreate = vi.fn()
  const blockDeleteMany = vi.fn()
  const txStub = {
    booking: { create: bookingCreate, findMany: bookingFindMany },
    bookingHold: { findMany: bookingHoldFindMany },
    lane: { count: laneCount },
    payment: { create: paymentCreate },
    auditLog: { create: auditCreate },
    blockedSlot: { create: blockCreate, deleteMany: blockDeleteMany },
  }
  return {
    requireRoleMock: vi.fn(),
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    bookingFindMany,
    bookingFindUnique: vi.fn(),
    bookingHoldFindMany,
    laneCount,
    blockFindMany: vi.fn(),
    bookingCreate,
    paymentCreate,
    auditCreate,
    blockCreate,
    blockDeleteMany,
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({ requireRole: mocks.requireRoleMock }))
vi.mock('@/lib/env', () => ({ isDevWithoutDb: mocks.isDevWithoutDbMock }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: mocks.bookingFindMany,
      findUnique: mocks.bookingFindUnique,
    },
    blockedSlot: { findMany: mocks.blockFindMany },
    $transaction: mocks.txMock,
  },
}))

import {
  blockLanes,
  createWalkInBooking,
  getBookingDetail,
  getScheduleForDate,
  getTodayBookings,
  unblockLanes,
} from './staff'

beforeEach(() => {
  Object.values(mocks).forEach((m) => {
    if (typeof m === 'function' && 'mockReset' in m) {
      ;(m as ReturnType<typeof vi.fn>).mockReset()
    }
  })
  mocks.isDevWithoutDbMock.mockReturnValue(false)
  mocks.requireRoleMock.mockResolvedValue({
    id: 'user_staff',
    email: 'staff@royalz.local',
    role: 'STAFF',
  })
  mocks.bookingFindMany.mockResolvedValue([])
  mocks.bookingHoldFindMany.mockResolvedValue([])
  mocks.laneCount.mockResolvedValue(8)
  mocks.txMock.mockImplementation(
    async (fn) =>
      fn({
        booking: {
          create: mocks.bookingCreate,
          findMany: mocks.bookingFindMany,
        },
        bookingHold: { findMany: mocks.bookingHoldFindMany },
        lane: { count: mocks.laneCount },
        payment: { create: mocks.paymentCreate },
        auditLog: { create: mocks.auditCreate },
        blockedSlot: {
          create: mocks.blockCreate,
          deleteMany: mocks.blockDeleteMany,
        },
      } as Parameters<typeof fn>[0]),
  )
})

describe('staff actions: role gating', () => {
  it('getTodayBookings requires STAFF, MANAGER, or ADMIN', async () => {
    mocks.bookingFindMany.mockResolvedValue([])
    await getTodayBookings('t1')
    expect(mocks.requireRoleMock).toHaveBeenCalledWith(
      'STAFF',
      'MANAGER',
      'ADMIN',
    )
  })

  it('createWalkInBooking requires STAFF, MANAGER, or ADMIN', async () => {
    mocks.bookingCreate.mockResolvedValue({
      id: 'bk_1',
      confirmationCode: 'ABC123',
    })
    await createWalkInBooking({
      tenantId: 't1',
      packageId: 'pkg_1',
      partyType: 'OPEN',
      bowlerCount: 4,
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600_000),
      totalAmount: 4500,
      customerName: 'Walk-In',
      customerEmail: '',
      paymentMethod: 'cash',
    })
    expect(mocks.requireRoleMock).toHaveBeenCalledWith(
      'STAFF',
      'MANAGER',
      'ADMIN',
    )
  })

  it('blockLanes requires STAFF, MANAGER, or ADMIN', async () => {
    mocks.blockCreate.mockResolvedValue({ id: 'block_1' })
    await blockLanes({
      tenantId: 't1',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600_000),
      lanes: [3, 4],
    })
    expect(mocks.requireRoleMock).toHaveBeenCalledWith(
      'STAFF',
      'MANAGER',
      'ADMIN',
    )
  })
})

describe('getTodayBookings', () => {
  it('returns mock rows in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const rows = await getTodayBookings('t1')
    expect(rows.length).toBeGreaterThan(0)
    expect(mocks.bookingFindMany).not.toHaveBeenCalled()
  })

  it('queries only today\u2019s CONFIRMED/COMPLETED/NO_SHOW bookings', async () => {
    mocks.bookingFindMany.mockResolvedValue([])
    await getTodayBookings('t1')
    expect(mocks.bookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 't1',
          status: { in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW'] },
        }),
        orderBy: { startTime: 'asc' },
      }),
    )
  })
})

describe('getScheduleForDate', () => {
  it('returns mock bookings + blocks in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const { bookings, blocks } = await getScheduleForDate('t1', '2026-01-01')
    expect(bookings.length).toBeGreaterThan(0)
    expect(blocks.length).toBeGreaterThan(0)
    expect(mocks.bookingFindMany).not.toHaveBeenCalled()
  })

  it('issues parallel queries for bookings and blocks', async () => {
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.blockFindMany.mockResolvedValue([])
    await getScheduleForDate('t1', '2026-01-01')
    expect(mocks.bookingFindMany).toHaveBeenCalledOnce()
    expect(mocks.blockFindMany).toHaveBeenCalledOnce()
  })
})

describe('getBookingDetail', () => {
  it('returns a mock detail in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const detail = await getBookingDetail('bk_mock_0')
    expect(detail).not.toBeNull()
    expect(detail?.payment).not.toBeNull()
  })

  it('returns null when not found', async () => {
    mocks.bookingFindUnique.mockResolvedValue(null)
    const out = await getBookingDetail('missing')
    expect(out).toBeNull()
  })
})

describe('createWalkInBooking', () => {
  it('rejects negative totalAmount', async () => {
    await expect(
      createWalkInBooking({
        tenantId: 't1',
        packageId: 'pkg',
        partyType: 'OPEN',
        bowlerCount: 1,
        startTime: new Date(),
        endTime: new Date(),
        totalAmount: -1,
        customerName: 'a',
        customerEmail: 'a@b.co',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/totalAmount/i)
  })

  it('rejects bowlerCount < 1', async () => {
    await expect(
      createWalkInBooking({
        tenantId: 't1',
        packageId: 'pkg',
        partyType: 'OPEN',
        bowlerCount: 0,
        startTime: new Date(),
        endTime: new Date(),
        totalAmount: 4500,
        customerName: 'a',
        customerEmail: 'a@b.co',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/bowlerCount/i)
  })

  it('returns mocked result in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const result = await createWalkInBooking({
      tenantId: 't1',
      packageId: 'pkg',
      partyType: 'OPEN',
      bowlerCount: 4,
      startTime: new Date(),
      endTime: new Date(),
      totalAmount: 4500,
      customerName: 'Walk-In',
      customerEmail: '',
      paymentMethod: 'cash',
    })
    expect(result.mocked).toBe(true)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
  })

  it('creates a CONFIRMED booking with source=WALK_IN and a Payment row', async () => {
    mocks.bookingCreate.mockResolvedValue({
      id: 'bk_1',
      confirmationCode: 'ABC123',
    })
    const start = new Date('2026-06-01T18:00:00Z')
    const end = new Date('2026-06-01T20:00:00Z')
    await createWalkInBooking({
      tenantId: 't1',
      packageId: 'pkg_classic',
      partyType: 'BIRTHDAY',
      bowlerCount: 12,
      startTime: start,
      endTime: end,
      totalAmount: 12000,
      customerName: 'Riley Party',
      customerEmail: '',
      paymentMethod: 'card_at_counter',
      notes: 'Allergic to peanuts',
    })

    expect(mocks.bookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'CONFIRMED',
        source: 'WALK_IN',
        bowlerCount: 12,
        laneCount: 2,
        userId: 'user_staff',
        customerName: 'Riley Party',
        notes: 'Allergic to peanuts',
      }),
    })
    expect(mocks.paymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'bk_1',
        amount: 12000,
        status: 'card_at_counter',
      }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'bk_1',
        userId: 'user_staff',
        action: 'BOOKING_WALK_IN_CREATED',
      }),
    })
  })

  it('skips Payment row creation when totalAmount is 0', async () => {
    mocks.bookingCreate.mockResolvedValue({
      id: 'bk_2',
      confirmationCode: 'ZERO',
    })
    await createWalkInBooking({
      tenantId: 't1',
      packageId: 'pkg',
      partyType: 'OPEN',
      bowlerCount: 1,
      startTime: new Date(),
      endTime: new Date(),
      totalAmount: 0,
      customerName: 'comp',
      customerEmail: '',
      paymentMethod: 'pending',
    })
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })

  it('rejects when overlapping bookings and holds consume lane capacity', async () => {
    const start = new Date('2026-06-01T18:00:00Z')
    const end = new Date('2026-06-01T19:00:00Z')
    mocks.laneCount.mockResolvedValue(2)
    mocks.bookingFindMany.mockResolvedValue([
      { startTime: start, endTime: end, laneCount: 1 },
    ])
    mocks.bookingHoldFindMany.mockResolvedValue([
      { startTime: start, endTime: end, laneCount: 1 },
    ])

    await expect(
      createWalkInBooking({
        tenantId: 't1',
        packageId: 'pkg',
        partyType: 'OPEN',
        bowlerCount: 1,
        startTime: start,
        endTime: end,
        totalAmount: 4500,
        customerName: 'capacity test',
        customerEmail: '',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/no longer available/i)

    expect(mocks.bookingCreate).not.toHaveBeenCalled()
    expect(mocks.paymentCreate).not.toHaveBeenCalled()
  })
})

describe('blockLanes', () => {
  it('rejects endTime <= startTime', async () => {
    const t = new Date()
    await expect(
      blockLanes({
        tenantId: 't1',
        startTime: t,
        endTime: t,
        lanes: [1],
      }),
    ).rejects.toThrow(/endTime/i)
  })

  it('creates a BlockedSlot + AuditLog and returns the id', async () => {
    mocks.blockCreate.mockResolvedValue({ id: 'block_1' })
    const result = await blockLanes({
      tenantId: 't1',
      startTime: new Date('2026-06-01T14:00:00Z'),
      endTime: new Date('2026-06-01T16:00:00Z'),
      lanes: [3, 4],
      reason: 'Maintenance',
    })
    expect(result.blockId).toBe('block_1')
    expect(mocks.blockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        lanes: [3, 4],
        reason: 'Maintenance',
      }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LANE_BLOCK_CREATED',
        entityType: 'BlockedSlot',
        entityId: 'block_1',
      }),
    })
  })
})

describe('unblockLanes', () => {
  it('is a no-op in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    await unblockLanes('block_real_1')
    expect(mocks.blockDeleteMany).not.toHaveBeenCalled()
  })

  it('skips ids that don\u2019t look like blocks', async () => {
    await unblockLanes('not-a-block')
    expect(mocks.blockDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes the block and writes an AuditLog', async () => {
    await unblockLanes('block_xyz')
    expect(mocks.blockDeleteMany).toHaveBeenCalledWith({
      where: { id: 'block_xyz' },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LANE_BLOCK_REMOVED',
        entityId: 'block_xyz',
      }),
    })
  })
})
