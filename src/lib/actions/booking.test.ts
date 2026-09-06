import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isDevWithoutDbMock: vi.fn(() => false),
  createPaymentIntentMock: vi.fn(),
  isStripeMockedMock: vi.fn(() => false),
  validatePromoCodeMock: vi.fn(),
  calculatePriceMock: vi.fn(),
  calculateBookingTotalMock: vi.fn(),
  tenantFindUnique: vi.fn(),
  bookingHoldCreate: vi.fn(),
  bookingHoldFindUnique: vi.fn(),
  bookingHoldDeleteMany: vi.fn(),
  bookingFindMany: vi.fn(),
  bookingHoldFindMany: vi.fn(),
  blockedSlotFindMany: vi.fn(),
  laneCount: vi.fn(),
  packageFindMany: vi.fn(),
  packageFindFirst: vi.fn(),
  transactionMock: vi.fn(),
  getTenantMock: vi.fn(),
}))

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
vi.mock('@/lib/actions/promo', () => ({
  validatePromoCode: mocks.validatePromoCodeMock,
}))
vi.mock('@/lib/pricing', () => ({
  calculatePrice: mocks.calculatePriceMock,
  calculateBookingTotal: mocks.calculateBookingTotalMock,
}))
vi.mock('@/lib/stripe', () => ({
  createPaymentIntent: mocks.createPaymentIntentMock,
  isStripeMocked: mocks.isStripeMockedMock,
}))
vi.mock('@/lib/tenant', () => ({
  getTenant: mocks.getTenantMock,
}))
vi.mock('@/lib/pricing-periods-data', () => ({
  loadPricingPeriodsForTenant: vi.fn(async () => []),
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
    blockedSlot: { findMany: mocks.blockedSlotFindMany },
    lane: { count: mocks.laneCount },
    package: {
      findMany: mocks.packageFindMany,
      findFirst: mocks.packageFindFirst,
    },
    pricingPeriod: { findMany: vi.fn(async () => []) },
    $transaction: mocks.transactionMock,
  },
}))

import {
  acquireBookingHold,
  confirmBooking,
  getAvailableTimeSlots,
  getPackagesForTenant,
  releaseBookingHold,
} from './booking'

/** Local calendar day used for availability tests — must be in the future. */
const FUTURE_SLOT_DATE = '2027-06-15'

function futureHoldWindow(hoursFromNow = 2): { startTime: Date; endTime: Date } {
  const startTime = new Date(Date.now() + hoursFromNow * 3_600_000)
  const endTime = new Date(startTime.getTime() + 2 * 3_600_000)
  return { startTime, endTime }
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => {
    if (typeof m === 'function' && 'mockReset' in m) {
      ;(m as ReturnType<typeof vi.fn>).mockReset()
    }
  })
  mocks.isDevWithoutDbMock.mockReturnValue(false)
  mocks.isStripeMockedMock.mockReturnValue(false)
  mocks.validatePromoCodeMock.mockResolvedValue({
    code: 'none',
    description: null,
    discountType: 'PERCENT',
    discountValue: 0,
    discountCents: 0,
  })
  mocks.calculatePriceMock.mockReturnValue({ totalAmount: 4500, lineItems: [] })
  mocks.laneCount.mockResolvedValue(8)
  mocks.bookingFindMany.mockResolvedValue([])
  mocks.bookingHoldFindMany.mockResolvedValue([])
  mocks.blockedSlotFindMany.mockResolvedValue([])
  mocks.tenantFindUnique.mockResolvedValue({ config: {} })
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
  mocks.transactionMock.mockImplementation(async (fn) =>
    fn({
      tenant: { findUnique: mocks.tenantFindUnique },
      bookingHold: {
        create: mocks.bookingHoldCreate,
        findUnique: mocks.bookingHoldFindUnique,
        deleteMany: mocks.bookingHoldDeleteMany,
        findMany: mocks.bookingHoldFindMany,
      },
      booking: { findMany: mocks.bookingFindMany },
      blockedSlot: { findMany: mocks.blockedSlotFindMany },
      lane: { count: mocks.laneCount },
      package: {
        findMany: mocks.packageFindMany,
        findFirst: mocks.packageFindFirst,
      },
    }),
  )
})

describe('acquireBookingHold', () => {
  it('returns mock holdId without touching prisma in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const result = await acquireBookingHold({
      tenantId: 't1',
      startTime: new Date(Date.now() + 3_600_000),
      endTime: new Date(Date.now() + 2 * 3_600_000),
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

    const { startTime, endTime } = futureHoldWindow()
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

  it('rejects a hold when overlapping reservations consume lane capacity', async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      holdTimeoutMins: 7,
      maxOnlineBowlers: 18,
    })
    mocks.laneCount.mockResolvedValue(2)
    const { startTime: slotStart, endTime: slotEnd } = futureHoldWindow()
    mocks.bookingFindMany.mockResolvedValue([
      { startTime: slotStart, endTime: slotEnd, laneCount: 1 },
    ])
    mocks.bookingHoldFindMany.mockResolvedValue([
      { startTime: slotStart, endTime: slotEnd, laneCount: 1 },
    ])

    await expect(
      acquireBookingHold({
        tenantId: 't1',
        startTime: slotStart,
        endTime: slotEnd,
        bowlerCount: 6,
      }),
    ).rejects.toThrow(/no longer available/i)
    expect(mocks.bookingHoldCreate).not.toHaveBeenCalled()
  })

  it('rejects a hold when lane blocks consume remaining capacity', async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      holdTimeoutMins: 7,
      maxOnlineBowlers: 18,
    })
    mocks.laneCount.mockResolvedValue(2)
    const { startTime: slotStart, endTime: slotEnd } = futureHoldWindow()
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    mocks.blockedSlotFindMany.mockResolvedValue([
      {
        startTime: slotStart,
        endTime: slotEnd,
        lanes: [1, 2],
      },
    ])

    await expect(
      acquireBookingHold({
        tenantId: 't1',
        startTime: slotStart,
        endTime: slotEnd,
        bowlerCount: 6,
      }),
    ).rejects.toThrow(/no longer available/i)
    expect(mocks.bookingHoldCreate).not.toHaveBeenCalled()
  })

  it('throws if tenant is not found', async () => {
    mocks.tenantFindUnique.mockResolvedValue(null)
    await expect(
      acquireBookingHold({
        tenantId: 'missing',
        startTime: new Date(Date.now() + 3_600_000),
        endTime: new Date(Date.now() + 2 * 3_600_000),
        bowlerCount: 1,
      }),
    ).rejects.toThrow(/Tenant not found/i)
  })

  it('rejects a hold for a slot that has already started', async () => {
    await expect(
      acquireBookingHold({
        tenantId: 't1',
        startTime: new Date(Date.now() - 3_600_000),
        endTime: new Date(Date.now() + 3_600_000),
        bowlerCount: 1,
      }),
    ).rejects.toThrow(/already started/i)
    expect(mocks.bookingHoldCreate).not.toHaveBeenCalled()
  })
})

describe('releaseBookingHold', () => {
  it('is a no-op in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    await releaseBookingHold('hold_real_123')
    expect(mocks.bookingHoldDeleteMany).not.toHaveBeenCalled()
  })

  it('skips mock hold ids without hitting the DB', async () => {
    await releaseBookingHold('hold_mock_123')
    expect(mocks.bookingHoldDeleteMany).not.toHaveBeenCalled()
  })

  it('deletes the hold row by id', async () => {
    await releaseBookingHold('cmhold_real_id')
    expect(mocks.bookingHoldDeleteMany).toHaveBeenCalledWith({
      where: { id: 'cmhold_real_id' },
    })
  })
})

describe('getAvailableTimeSlots', () => {
  it('returns mock slots with availability fields in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const slots = await getAvailableTimeSlots('t1', FUTURE_SLOT_DATE, 6)
    expect(slots.length).toBe(8)
    expect(mocks.bookingHoldDeleteMany).not.toHaveBeenCalled()
    expect(mocks.bookingFindMany).not.toHaveBeenCalled()

    const hour16 = slots.find((s) => s.id === `${FUTURE_SLOT_DATE}-16`)
    expect(hour16?.available).toBe(false)
    expect(hour16?.lanesFree).toBe(0)
    expect(hour16?.spotsRemaining).toBe(0)

    const hour20 = slots.find((s) => s.id === `${FUTURE_SLOT_DATE}-20`)
    expect(hour20?.available).toBe(true)
    expect(hour20?.lanesFree).toBe(6)
    expect(hour20?.spotsRemaining).toBe(6)

    const hour22 = slots.find((s) => s.id === `${FUTURE_SLOT_DATE}-22`)
    expect(hour22?.available).toBe(true)
    expect(hour22?.lanesFree).toBe(8)
    expect(hour22?.spotsRemaining).toBe(8)
  })

  it('cleans up expired holds before computing availability', async () => {
    mocks.laneCount.mockResolvedValue(8)
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    await getAvailableTimeSlots('t1', FUTURE_SLOT_DATE, 6)
    expect(mocks.bookingHoldDeleteMany).toHaveBeenCalledWith({
      where: { tenantId: 't1', expiresAt: { lt: expect.any(Date) } },
    })
  })

  it('marks a slot unavailable when confirmed bookings + holds exceed capacity', async () => {
    mocks.laneCount.mockResolvedValue(2)
    mocks.bookingFindMany.mockResolvedValue([
      {
        startTime: new Date(`${FUTURE_SLOT_DATE}T18:00:00`),
        endTime: new Date(`${FUTURE_SLOT_DATE}T19:00:00`),
        laneCount: 1,
      },
    ])
    mocks.bookingHoldFindMany.mockResolvedValue([
      {
        startTime: new Date(`${FUTURE_SLOT_DATE}T18:00:00`),
        endTime: new Date(`${FUTURE_SLOT_DATE}T19:00:00`),
        laneCount: 1,
      },
    ])
    const slots = await getAvailableTimeSlots('t1', FUTURE_SLOT_DATE, 6)
    const occupied = slots.find((s) => s.id === `${FUTURE_SLOT_DATE}-18`)
    const free = slots.find((s) => s.id === `${FUTURE_SLOT_DATE}-20`)
    expect(occupied?.available).toBe(false)
    expect(occupied?.spotsRemaining).toBe(0)
    expect(free?.available).toBe(true)
    expect(free?.lanesFree).toBe(2)
    expect(free?.spotsRemaining).toBe(2)
  })

  it('marks a slot unavailable when lane blocks consume capacity', async () => {
    mocks.laneCount.mockResolvedValue(2)
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    mocks.blockedSlotFindMany.mockResolvedValue([
      {
        startTime: new Date(`${FUTURE_SLOT_DATE}T18:00:00`),
        endTime: new Date(`${FUTURE_SLOT_DATE}T19:00:00`),
        lanes: [1, 2],
      },
    ])
    const slots = await getAvailableTimeSlots('t1', FUTURE_SLOT_DATE, 6)
    const blockedSlot = slots.find((s) => s.id === `${FUTURE_SLOT_DATE}-18`)
    expect(blockedSlot?.available).toBe(false)
    expect(blockedSlot?.spotsRemaining).toBe(0)
  })

  it('counts PENDING_PAYMENT bookings when computing availability', async () => {
    mocks.laneCount.mockResolvedValue(8)
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    await getAvailableTimeSlots('t1', FUTURE_SLOT_DATE, 6)
    expect(mocks.bookingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'PENDING_PAYMENT'],
          },
        }),
      }),
    )
  })

  it('generates slots using the tenant minimum booking duration', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
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
      config: { minBookingDurationHours: 1.5 },
    })

    const slots = await getAvailableTimeSlots('t1', FUTURE_SLOT_DATE, 6)
    const first = slots[0]
    expect(first?.startTime.getHours()).toBe(16)
    expect(first?.endTime.getTime() - first!.startTime.getTime()).toBe(
      1.5 * 60 * 60 * 1000,
    )
    expect(slots.length).toBe(5)
  })

  it('marks elapsed slots unavailable even when lanes are free', async () => {
    mocks.laneCount.mockResolvedValue(8)
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.bookingHoldFindMany.mockResolvedValue([])
    const slots = await getAvailableTimeSlots('t1', '2020-01-15', 6)
    expect(slots.length).toBeGreaterThan(0)
    expect(slots.every((slot) => slot.available === false)).toBe(true)
  })
})

describe('confirmBooking', () => {
  const startTime = new Date('2026-02-01T18:00:00Z')
  const endTime = new Date('2026-02-01T19:00:00Z')

  beforeEach(() => {
    mocks.bookingHoldFindUnique.mockResolvedValue({
      id: 'h1',
      tenantId: 't1',
      bowlerCount: 4,
      laneCount: 1,
      startTime,
      endTime,
      expiresAt: new Date(Date.now() + 60_000),
    })
    mocks.packageFindFirst.mockResolvedValue({
      id: 'pkg_classic',
      partyTypes: ['OPEN'],
      shoesIncluded: true,
    })
    mocks.calculateBookingTotalMock.mockReturnValue({
      totalAmount: 4500,
      lineItems: [],
      baseAmount: 4500,
      gameAmount: 0,
      shoeAmount: 0,
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
        laneCount: 1,
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
      bowlerCount: 1,
      laneCount: 1,
      startTime,
      endTime,
      expiresAt: new Date(Date.now() - 60_000),
    })
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg',
        partyType: 'OPEN',
        bowlerCount: 1,
        laneCount: 1,
        startTime: new Date(),
        endTime: new Date(),
        totalAmount: 100,
        customerName: 'a',
        customerEmail: 'a@b.co',
        customerPhone: '',
      }),
    ).rejects.toThrow(/expired/i)
  })

  it('rejects CODE_REQUIRED packages without a valid access code', async () => {
    mocks.packageFindFirst.mockResolvedValue({
      id: 'pkg_vip',
      accessType: 'CODE_REQUIRED',
      partyTypes: ['OPEN'],
      shoesIncluded: true,
    })
    mocks.packageFindMany.mockResolvedValue([
      { id: 'pkg_vip', name: 'VIP', codeString: 'VIP2026' },
    ])
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg_vip',
        partyType: 'OPEN',
        bowlerCount: 4,
        laneCount: 1,
        startTime,
        endTime,
        totalAmount: 4500,
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
        customerPhone: '',
      }),
    ).rejects.toThrow(/access code/i)
  })

  it('accepts CODE_REQUIRED packages when access code matches', async () => {
    mocks.packageFindFirst.mockResolvedValue({
      id: 'pkg_vip',
      accessType: 'CODE_REQUIRED',
      partyTypes: ['OPEN'],
      shoesIncluded: true,
    })
    mocks.packageFindMany.mockResolvedValue([
      { id: 'pkg_vip', name: 'VIP', codeString: 'VIP2026' },
    ])
    const result = await confirmBooking({
      tenantId: 't1',
      holdId: 'h1',
      packageId: 'pkg_vip',
      partyType: 'OPEN',
      bowlerCount: 4,
      laneCount: 1,
      startTime,
      endTime,
      totalAmount: 4500,
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      customerPhone: '',
      packageAccessCode: 'VIP2026',
    })
    expect(result.clientSecret).toBe('pi_1_secret_x')
  })

  it('embeds booking inputs in PaymentIntent metadata', async () => {
    await confirmBooking({
      tenantId: 't1',
      holdId: 'h1',
      packageId: 'pkg_classic',
      partyType: 'OPEN',
      bowlerCount: 4,
      laneCount: 1,
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
        idempotencyKey: expect.stringMatching(/^booking-hold:h1:[a-f0-9]{32}$/),
        metadata: expect.objectContaining({
          holdId: 'h1',
          tenantId: 't1',
          packageId: 'pkg_classic',
          bowlerCount: '4',
          laneCount: '1',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          customerName: 'Jane',
          subtotalCents: '4500',
        }),
      }),
    )
    expect(mocks.validatePromoCodeMock).not.toHaveBeenCalled()
  })

  it('uses the hidden lane-only package id for open bowling metadata', async () => {
    mocks.packageFindMany.mockResolvedValue([
      {
        id: 'pkg_lane_only',
        tenantId: 't1',
        name: 'Open Bowling',
        description: null,
        basePrice: 0,
        gameIncluded: false,
        shoesIncluded: false,
        gameCostPer: null,
        shoeCostPer: null,
        partyTypes: ['OPEN'],
        active: true,
        sortOrder: 99,
      },
    ])

    await confirmBooking({
      tenantId: 't1',
      holdId: 'h1',
      packageId: null,
      partyType: 'OPEN',
      bowlerCount: 4,
      laneCount: 1,
      startTime,
      endTime,
      totalAmount: 4500,
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      customerPhone: '555',
      shoeSelections: [
        { bowlerId: '1', size: 'M8', cost: 0 },
        { bowlerId: '2', size: 'M9', cost: 0 },
        { bowlerId: '3', size: 'W7', cost: 0 },
        { bowlerId: '4', size: 'W8', cost: 0 },
      ],
    })

    expect(mocks.packageFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 't1',
        active: true,
        basePrice: 0,
        gameIncluded: false,
        shoesIncluded: false,
        partyTypes: { has: 'OPEN' },
      },
      orderBy: { sortOrder: 'asc' },
    })
    expect(mocks.createPaymentIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          packageId: 'pkg_lane_only',
          partyType: 'OPEN',
        }),
      }),
    )
    expect(mocks.packageFindFirst).not.toHaveBeenCalled()
  })

  it('rejects tampered totals that do not match server pricing', async () => {
    mocks.calculateBookingTotalMock.mockReturnValue({
      totalAmount: 5000,
      lineItems: [],
      baseAmount: 5000,
      gameAmount: 0,
      shoeAmount: 0,
    })
    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg_classic',
        partyType: 'OPEN',
        bowlerCount: 4,
        laneCount: 1,
        startTime,
        endTime,
        totalAmount: 4500,
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
        customerPhone: '555',
      }),
    ).rejects.toThrow(/total changed/i)
  })

  it('ignores client pricing hints when calling calculateBookingTotal', async () => {
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
      config: { shoeRentalPriceCents: 400, laneReservationCentsPerLane: 850 },
    })

    await confirmBooking({
      tenantId: 't1',
      holdId: 'h1',
      packageId: 'pkg_classic',
      partyType: 'OPEN',
      bowlerCount: 4,
      laneCount: 1,
      startTime,
      endTime,
      totalAmount: 4500,
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      customerPhone: '555',
      shoeRentalPriceCents: 1,
      laneReservationCentsPerLane: 1,
    })

    expect(mocks.calculateBookingTotalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        shoeRentalPriceCents: 400,
      }),
    )
    expect(mocks.calculateBookingTotalMock.mock.calls[0]?.[0]).not.toMatchObject({
      shoeRentalPriceCents: 1,
    })
  })

  it('rejects checkout when shoe selections are incomplete', async () => {
    mocks.packageFindFirst.mockResolvedValue({
      id: 'pkg_open',
      partyTypes: ['OPEN'],
      shoesIncluded: false,
    })

    await expect(
      confirmBooking({
        tenantId: 't1',
        holdId: 'h1',
        packageId: 'pkg_open',
        partyType: 'OPEN',
        bowlerCount: 4,
        laneCount: 1,
        startTime,
        endTime,
        totalAmount: 4500,
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
        customerPhone: '555',
        shoeSelections: [
          { bowlerId: '1', size: 'M8', cost: 0 },
          { bowlerId: '2', size: '', cost: 0 },
        ],
      }),
    ).rejects.toThrow(/shoe size required/i)

    expect(mocks.calculateBookingTotalMock).not.toHaveBeenCalled()
  })

  it('applies promo to charge amount and Stripe metadata', async () => {
    mocks.validatePromoCodeMock.mockResolvedValue({
      code: 'save10',
      description: null,
      discountType: 'FIXED',
      discountValue: 500,
      discountCents: 500,
    })
    const startTime = new Date('2026-02-01T18:00:00Z')
    const endTime = new Date('2026-02-01T19:00:00Z')
    await confirmBooking({
      tenantId: 't1',
      holdId: 'h1',
      packageId: 'pkg_classic',
      partyType: 'OPEN',
      bowlerCount: 4,
      laneCount: 1,
      startTime,
      endTime,
      totalAmount: 4500,
      promoCode: 'SAVE10',
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      customerPhone: '555',
    })
    expect(mocks.validatePromoCodeMock).toHaveBeenCalledWith(
      't1',
      'SAVE10',
      4500,
    )
    expect(mocks.createPaymentIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 4000,
        metadata: expect.objectContaining({
          promoCode: 'save10',
          discountCents: '500',
          subtotalCents: '4500',
        }),
      }),
    )
  })

  it('reuses the Stripe idempotency key for identical confirm retries', async () => {
    const input = {
      tenantId: 't1',
      holdId: 'h1',
      packageId: 'pkg_classic',
      partyType: 'OPEN' as const,
      bowlerCount: 4,
      laneCount: 1,
      startTime,
      endTime,
      totalAmount: 4500,
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      customerPhone: '555',
    }
    await confirmBooking(input)
    await confirmBooking(input)
    const keys = mocks.createPaymentIntentMock.mock.calls.map(
      (call) => call[0]?.idempotencyKey,
    )
    expect(keys).toHaveLength(2)
    expect(keys[0]).toMatch(/^booking-hold:h1:[a-f0-9]{32}$/)
    expect(keys[1]).toBe(keys[0])
  })

  it('uses a new Stripe idempotency key when promo changes the charge', async () => {
    const base = {
      tenantId: 't1',
      holdId: 'h1',
      packageId: 'pkg_classic',
      partyType: 'OPEN' as const,
      bowlerCount: 4,
      laneCount: 1,
      startTime,
      endTime,
      totalAmount: 4500,
      customerName: 'Jane',
      customerEmail: 'jane@example.com',
      customerPhone: '555',
    }
    await confirmBooking(base)
    mocks.validatePromoCodeMock.mockResolvedValue({
      code: 'save10',
      description: null,
      discountType: 'FIXED',
      discountValue: 500,
      discountCents: 500,
    })
    await confirmBooking({ ...base, promoCode: 'SAVE10' })
    const keys = mocks.createPaymentIntentMock.mock.calls.map(
      (call) => call[0]?.idempotencyKey,
    )
    expect(keys).toHaveLength(2)
    expect(keys[0]).toMatch(/^booking-hold:h1:[a-f0-9]{32}$/)
    expect(keys[1]).toMatch(/^booking-hold:h1:[a-f0-9]{32}$/)
    expect(keys[1]).not.toBe(keys[0])
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
      where: {
        tenantId: 't1',
        active: true,
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        basePrice: true,
        gameIncluded: true,
        shoesIncluded: true,
        gameCostPer: true,
        shoeCostPer: true,
        partyTypes: true,
        accessType: true,
        paymentMode: true,
        active: true,
        sortOrder: true,
      },
    })
  })

  it('does not expose access codes in customer package rows', async () => {
    mocks.packageFindMany.mockResolvedValue([
      {
        id: 'pkg_vip',
        tenantId: 't1',
        name: 'VIP',
        description: null,
        basePrice: 12000,
        gameIncluded: true,
        shoesIncluded: true,
        gameCostPer: null,
        shoeCostPer: null,
        partyTypes: ['OPEN'],
        accessType: 'CODE_REQUIRED',
        paymentMode: 'PAYMENT_OFFLINE',
        active: true,
        sortOrder: 1,
        codeString: 'VIP2026',
      },
      {
        id: 'pkg_lane_only',
        tenantId: 't1',
        name: 'Open Bowling',
        description: null,
        basePrice: 0,
        gameIncluded: false,
        shoesIncluded: false,
        gameCostPer: null,
        shoeCostPer: null,
        partyTypes: ['OPEN'],
        accessType: 'PUBLIC',
        paymentMode: null,
        active: true,
        sortOrder: 99,
        codeString: null,
      },
    ])

    const rows = await getPackagesForTenant('t1')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'pkg_vip',
      accessType: 'CODE_REQUIRED',
      paymentMode: 'PAYMENT_OFFLINE',
      codeString: null,
    })
  })
})
