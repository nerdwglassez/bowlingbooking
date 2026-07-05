import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const bookingCreate = vi.fn()
  const bookingUpdate = vi.fn()
  const bookingUpdateMany = vi.fn()
  const bookingFindFirst = vi.fn()
  const paymentCreate = vi.fn()
  const auditCreate = vi.fn()
  const blockCreate = vi.fn()
  const blockDeleteMany = vi.fn()
  const blockedSlotFindMany = vi.fn()
  const tenantFindUniqueOrThrow = vi.fn()
  const packageFindFirst = vi.fn()
  const bookingFindMany = vi.fn()
  const bookingHoldFindMany = vi.fn()
  const laneCount = vi.fn()
  const laneFindMany = vi.fn()
  const bookingLaneCreate = vi.fn()
  const assignBookingLanesMock = vi.fn()
  const reassignBookingLanesMock = vi.fn()
  const txStub = {
    booking: {
      create: bookingCreate,
      update: bookingUpdate,
      updateMany: bookingUpdateMany,
      findUnique: vi.fn(),
      findFirst: bookingFindFirst,
      findMany: bookingFindMany,
    },
    payment: { create: paymentCreate },
    auditLog: { create: auditCreate },
    blockedSlot: { create: blockCreate, deleteMany: blockDeleteMany, findMany: blockedSlotFindMany },
    tenant: { findUniqueOrThrow: tenantFindUniqueOrThrow },
    package: { findFirst: packageFindFirst },
    bookingHold: { findMany: bookingHoldFindMany },
    lane: { count: laneCount, findMany: laneFindMany },
    bookingLane: { create: bookingLaneCreate },
  }
  return {
    requireRoleMock: vi.fn(),
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    bookingFindMany,
    bookingFindUnique: vi.fn(),
    bookingFindFirst,
    blockFindMany: vi.fn(),
    laneCount,
    laneFindMany,
    bookingLaneCreate,
    bookingCreate,
    bookingUpdate,
    bookingUpdateMany,
    paymentCreate,
    auditCreate,
    blockCreate,
    blockDeleteMany,
    blockedSlotFindMany,
    tenantFindUniqueOrThrow,
    packageFindFirst,
    bookingHoldFindMany,
    assignBookingLanesMock,
    reassignBookingLanesMock,
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({ requireRole: mocks.requireRoleMock }))
vi.mock('@/lib/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/env')>()
  return {
    ...actual,
    isDevWithoutDb: mocks.isDevWithoutDbMock,
    shouldUseDevDbFallback: (err?: unknown) =>
      mocks.isDevWithoutDbMock() ||
      (err !== undefined && actual.isPrismaConnectivityError(err)),
    warnOnce: vi.fn(),
  }
})
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/lane-assignment', () => ({
  assignBookingLanes: mocks.assignBookingLanesMock,
  reassignBookingLanes: mocks.reassignBookingLanesMock,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: mocks.bookingFindMany,
      findUnique: mocks.bookingFindUnique,
      findFirst: mocks.bookingFindFirst,
      updateMany: mocks.bookingUpdateMany,
    },
    blockedSlot: { findMany: mocks.blockFindMany },
    lane: { count: mocks.laneCount, findMany: mocks.laneFindMany },
    package: { findFirst: mocks.packageFindFirst },
    $transaction: mocks.txMock,
  },
}))

import {
  blockLanes,
  checkInBookingAction,
  createWalkInBooking,
  getBookingDetail,
  getCockpitSnapshot,
  getScheduleForDate,
  getScheduleForMonth,
  getTodayBookings,
  markBookingCompletedAction,
  markBookingNoShowAction,
  staffModifyBookingAction,
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
    tenantId: 't1',
  })
  mocks.txMock.mockImplementation(
    async (fn) =>
      fn({
        booking: {
          create: mocks.bookingCreate,
          update: mocks.bookingUpdate,
          updateMany: mocks.bookingUpdateMany,
          findUnique: mocks.bookingFindUnique,
          findFirst: mocks.bookingFindFirst,
          findMany: mocks.bookingFindMany,
        },
        payment: { create: mocks.paymentCreate },
        auditLog: { create: mocks.auditCreate },
        blockedSlot: {
          create: mocks.blockCreate,
          deleteMany: mocks.blockDeleteMany,
          findMany: mocks.blockedSlotFindMany,
        },
        tenant: { findUniqueOrThrow: mocks.tenantFindUniqueOrThrow },
        package: { findFirst: mocks.packageFindFirst },
        bookingHold: { findMany: mocks.bookingHoldFindMany },
        lane: { count: mocks.laneCount, findMany: mocks.laneFindMany },
        bookingLane: { create: mocks.bookingLaneCreate },
      } as Parameters<typeof fn>[0]),
  )
  mocks.tenantFindUniqueOrThrow.mockResolvedValue({
    id: 't1',
    cancellationWindowHours: 24,
    rescheduleWindowHours: 24,
    bowlersPerLane: 6,
    cancellationRefundPercent: 100,
    config: {},
  })
  mocks.packageFindFirst.mockResolvedValue({ id: 'pkg_1' })
  mocks.laneCount.mockResolvedValue(8)
  mocks.bookingFindMany.mockResolvedValue([])
  mocks.bookingHoldFindMany.mockResolvedValue([])
  mocks.blockedSlotFindMany.mockResolvedValue([])
  mocks.bookingUpdateMany.mockResolvedValue({ count: 1 })
  mocks.blockDeleteMany.mockResolvedValue({ count: 1 })
  mocks.assignBookingLanesMock.mockResolvedValue([1])
  mocks.reassignBookingLanesMock.mockResolvedValue([1])
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

describe('getCockpitSnapshot', () => {
  it('returns mock lane grid and upcoming list in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const snapshot = await getCockpitSnapshot('t1')
    expect(snapshot.totalLanes).toBe(12)
    expect(snapshot.lanes).toHaveLength(12)
    expect(snapshot.bookings.length).toBeGreaterThan(0)
    expect(snapshot.blocks.length).toBeGreaterThan(0)
    expect(snapshot.stats.total).toBe(snapshot.bookings.length)
    expect(snapshot.referenceNow).toBeTruthy()
  })

  it('returns mock snapshot when the database is unreachable in dev', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.laneFindMany.mockRejectedValue(
      Object.assign(new Error("Can't reach database server at host:5432"), {
        code: 'P1001',
        name: 'PrismaClientKnownRequestError',
      }),
    )
    const snapshot = await getCockpitSnapshot('t1')
    expect(snapshot.totalLanes).toBe(12)
    expect(mocks.laneFindMany).toHaveBeenCalledOnce()
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

describe('getScheduleForMonth', () => {
  it('returns mock month summary in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const summary = await getScheduleForMonth('t1', 2026, 4)
    expect(summary.days).toHaveLength(31)
    expect(summary.totalLanes).toBeGreaterThan(0)
    expect(summary.blocks.length).toBeGreaterThan(0)
    expect(mocks.laneCount).not.toHaveBeenCalled()
  })

  it('queries lanes, bookings, and blocks for the month', async () => {
    mocks.laneCount.mockResolvedValue(8)
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.blockFindMany.mockResolvedValue([])
    const summary = await getScheduleForMonth('t1', 2026, 4)
    expect(summary.days).toHaveLength(31)
    expect(mocks.laneCount).toHaveBeenCalledOnce()
    expect(mocks.bookingFindMany).toHaveBeenCalledOnce()
    expect(mocks.blockFindMany).toHaveBeenCalledOnce()
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
    mocks.bookingFindFirst.mockResolvedValue(null)
    const out = await getBookingDetail('missing')
    expect(out).toBeNull()
  })

  it('scopes detail lookup to the authenticated tenant', async () => {
    mocks.bookingFindFirst.mockResolvedValue(null)
    await getBookingDetail('bk_other_tenant')
    expect(mocks.bookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk_other_tenant', tenantId: 't1' },
      }),
    )
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
    mocks.packageFindFirst.mockResolvedValue({ id: 'pkg_classic' })
    mocks.assignBookingLanesMock.mockResolvedValue([1, 2])
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
        status: 'succeeded',
        paymentMethod: 'card_at_counter',
      }),
    })
    expect(mocks.assignBookingLanesMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        bookingId: 'bk_1',
        tenantId: 't1',
        laneCount: 2,
        startTime: start,
        endTime: end,
      }),
    )
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bookingId: 'bk_1',
        userId: 'user_staff',
        action: 'BOOKING_WALK_IN_CREATED',
        details: expect.objectContaining({ laneNumbers: [1, 2] }),
      }),
    })
    expect(mocks.packageFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'pkg_classic',
          tenantId: 't1',
          active: true,
        }),
      }),
    )
  })

  it('rejects walk-in creation for another tenant', async () => {
    await expect(
      createWalkInBooking({
        tenantId: 't2',
        packageId: 'pkg_classic',
        partyType: 'OPEN',
        bowlerCount: 4,
        startTime: new Date(),
        endTime: new Date(),
        totalAmount: 4500,
        customerName: 'Walk-In',
        customerEmail: '',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/Resource not found/)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
  })

  it('rejects package ids outside the staff tenant', async () => {
    mocks.packageFindFirst.mockResolvedValue(null)
    await expect(
      createWalkInBooking({
        tenantId: 't1',
        packageId: 'pkg_other_tenant',
        partyType: 'OPEN',
        bowlerCount: 4,
        startTime: new Date(),
        endTime: new Date(),
        totalAmount: 4500,
        customerName: 'Walk-In',
        customerEmail: '',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/Package not found/)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
  })

  it('rejects walk-in creation when lane blocks consume capacity', async () => {
    mocks.packageFindFirst.mockResolvedValue({ id: 'pkg_classic' })
    mocks.laneCount.mockResolvedValue(8)
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    mocks.blockedSlotFindMany.mockResolvedValue([
      {
        startTime: new Date('2026-06-01T18:00:00Z'),
        endTime: new Date('2026-06-01T20:00:00Z'),
        lanes: [],
      },
    ])
    await expect(
      createWalkInBooking({
        tenantId: 't1',
        packageId: 'pkg_classic',
        partyType: 'OPEN',
        bowlerCount: 4,
        startTime: new Date('2026-06-01T18:00:00Z'),
        endTime: new Date('2026-06-01T20:00:00Z'),
        totalAmount: 4500,
        customerName: 'Walk-In',
        customerEmail: '',
        paymentMethod: 'cash',
      }),
    ).rejects.toThrow(/no longer available/i)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
  })

  it('rejects explicit walk-in lane selection on a blocked lane', async () => {
    mocks.packageFindFirst.mockResolvedValue({ id: 'pkg_classic' })
    mocks.laneCount.mockResolvedValue(8)
    mocks.laneFindMany.mockResolvedValue([
      { id: 'lane_1', number: 1 },
      { id: 'lane_2', number: 2 },
    ])
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    mocks.blockedSlotFindMany.mockResolvedValue([
      {
        startTime: new Date('2026-06-01T18:00:00Z'),
        endTime: new Date('2026-06-01T20:00:00Z'),
        lanes: [2],
      },
    ])
    await expect(
      createWalkInBooking({
        tenantId: 't1',
        packageId: 'pkg_classic',
        partyType: 'OPEN',
        bowlerCount: 6,
        startTime: new Date('2026-06-01T18:00:00Z'),
        endTime: new Date('2026-06-01T20:00:00Z'),
        totalAmount: 4500,
        customerName: 'Walk-In',
        customerEmail: '',
        paymentMethod: 'cash',
        laneNumbers: [2],
      }),
    ).rejects.toThrow(/blocked during this time/i)
    expect(mocks.bookingCreate).not.toHaveBeenCalled()
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
    await unblockLanes('clxyz123productioncuid')
    expect(mocks.blockDeleteMany).not.toHaveBeenCalled()
  })

  it('throws when the block is missing or outside the tenant', async () => {
    mocks.blockDeleteMany.mockResolvedValue({ count: 0 })
    await expect(unblockLanes('clmissingblockid000000000000')).rejects.toThrow(
      /Block not found/,
    )
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('deletes a production cuid block scoped to the tenant and writes an AuditLog', async () => {
    mocks.blockDeleteMany.mockResolvedValue({ count: 1 })
    await unblockLanes('clxyz123productioncuid')
    expect(mocks.blockDeleteMany).toHaveBeenCalledWith({
      where: { id: 'clxyz123productioncuid', tenantId: 't1' },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LANE_BLOCK_REMOVED',
        entityId: 'clxyz123productioncuid',
      }),
    })
  })
})

describe('staffModifyBookingAction', () => {
  it('reassigns lane links when booking time changes', async () => {
    const start = new Date('2026-06-01T18:00:00Z')
    const end = new Date('2026-06-01T19:00:00Z')
    const newStart = new Date('2026-06-01T20:00:00Z')
    const newEnd = new Date('2026-06-01T21:00:00Z')

    mocks.bookingFindFirst.mockResolvedValue({
      id: 'bk_1',
      tenantId: 't1',
      status: 'CONFIRMED',
      bowlerCount: 4,
      laneCount: 1,
      startTime: start,
      endTime: end,
      packageId: 'pkg_1',
      partyType: 'OPEN',
      bowlersPerLaneSnapshot: 6,
    })

    await staffModifyBookingAction({
      bookingId: 'bk_1',
      startTime: newStart,
      endTime: newEnd,
    })

    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'bk_1' },
      data: expect.objectContaining({
        startTime: newStart,
        endTime: newEnd,
        laneCount: 1,
      }),
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

  it('does not reassign lanes when only notes change', async () => {
    const start = new Date('2026-06-01T18:00:00Z')
    const end = new Date('2026-06-01T19:00:00Z')

    mocks.bookingFindFirst.mockResolvedValue({
      id: 'bk_1',
      tenantId: 't1',
      status: 'CONFIRMED',
      bowlerCount: 4,
      laneCount: 1,
      startTime: start,
      endTime: end,
      packageId: 'pkg_1',
      partyType: 'OPEN',
      bowlersPerLaneSnapshot: 6,
    })

    await staffModifyBookingAction({
      bookingId: 'bk_1',
      notes: 'VIP guest',
    })

    expect(mocks.reassignBookingLanesMock).not.toHaveBeenCalled()
  })

  it('rejects modification when the booking belongs to another tenant', async () => {
    mocks.bookingFindFirst.mockResolvedValue(null)
    await expect(
      staffModifyBookingAction({
        bookingId: 'bk_other',
        notes: 'Should fail',
      }),
    ).rejects.toThrow(/Booking not found/)
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
  })
})

describe('booking lifecycle tenant guards', () => {
  it('refuses check-in when the booking is in a terminal state', async () => {
    mocks.bookingUpdateMany.mockResolvedValue({ count: 0 })
    await expect(checkInBookingAction('bk_cancelled')).rejects.toThrow(
      /cannot be checked in/,
    )
    expect(mocks.bookingUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'bk_cancelled',
        tenantId: 't1',
        status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
      },
      data: expect.objectContaining({ checkedInAt: expect.any(Date) }),
    })
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('refuses no-show when the booking is not CONFIRMED', async () => {
    mocks.bookingUpdateMany.mockResolvedValue({ count: 0 })
    await expect(markBookingNoShowAction('bk_completed')).rejects.toThrow(
      /cannot be marked no-show/,
    )
    expect(mocks.bookingUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'bk_completed',
        tenantId: 't1',
        status: 'CONFIRMED',
      },
      data: { status: 'NO_SHOW', cancellationReason: 'NO_SHOW' },
    })
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('refuses completion when the booking is not CONFIRMED', async () => {
    mocks.bookingUpdateMany.mockResolvedValue({ count: 0 })
    await expect(markBookingCompletedAction('bk_cancelled')).rejects.toThrow(
      /cannot be completed/,
    )
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })
})
