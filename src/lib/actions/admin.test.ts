import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tenantUpdate = vi.fn()
  const tenantFindUnique = vi.fn()
  const hoursDeleteMany = vi.fn()
  const hoursCreateMany = vi.fn()
  const hoursFindMany = vi.fn()
  const packageCreate = vi.fn()
  const packageUpdate = vi.fn()
  const promoFindMany = vi.fn()
  const promoFindFirst = vi.fn()
  const promoFindUnique = vi.fn()
  const promoCreate = vi.fn()
  const promoUpdate = vi.fn()
  const packageFindMany = vi.fn()
  const packageFindUnique = vi.fn()
  const userCreate = vi.fn()
  const userUpdate = vi.fn()
  const userFindMany = vi.fn()
  const userFindUnique = vi.fn()
  const auditCreate = vi.fn()
  const auditFindMany = vi.fn()
  const auditCount = vi.fn()
  const bookingFindMany = vi.fn()
  const paymentAggregate = vi.fn()
  const laneCount = vi.fn()
  const packageCount = vi.fn()
  const userCount = vi.fn()
  const txStub = {
    tenant: { update: tenantUpdate, findUnique: tenantFindUnique },
    operatingHours: {
      deleteMany: hoursDeleteMany,
      createMany: hoursCreateMany,
    },
    package: { create: packageCreate, update: packageUpdate },
    promoCode: {
      findMany: promoFindMany,
      findFirst: promoFindFirst,
      findUnique: promoFindUnique,
      create: promoCreate,
      update: promoUpdate,
    },
    user: { create: userCreate, update: userUpdate },
    auditLog: { create: auditCreate },
    booking: { findMany: bookingFindMany },
    payment: { aggregate: paymentAggregate },
  }
  return {
    requireRoleMock: vi.fn(),
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    hashPasswordMock: vi.fn(),
    tenantUpdate,
    tenantFindUnique,
    hoursDeleteMany,
    hoursCreateMany,
    hoursFindMany,
    packageCreate,
    packageUpdate,
    promoFindMany,
    promoFindFirst,
    promoFindUnique,
    promoCreate,
    promoUpdate,
    packageFindMany,
    packageFindUnique,
    userCreate,
    userUpdate,
    userFindMany,
    userFindUnique,
    auditCreate,
    auditFindMany,
    auditCount,
    bookingFindMany,
    paymentAggregate,
    laneCount,
    packageCount,
    userCount,
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({
  requireRole: mocks.requireRoleMock,
  hashPassword: mocks.hashPasswordMock,
}))
vi.mock('@/lib/env', () => ({
  isDevWithoutDb: mocks.isDevWithoutDbMock,
  shouldUseDevDbFallback: (err?: unknown) =>
    mocks.isDevWithoutDbMock() ||
    (err !== undefined &&
      err instanceof Error &&
      (err.message.includes("Can't reach database server") ||
        err.message.includes('Transaction already closed'))),
  warnOnce: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: mocks.tenantFindUnique, update: mocks.tenantUpdate },
    operatingHours: {
      findMany: mocks.hoursFindMany,
      deleteMany: mocks.hoursDeleteMany,
      createMany: mocks.hoursCreateMany,
    },
    package: {
      findMany: mocks.packageFindMany,
      findUnique: mocks.packageFindUnique,
      create: mocks.packageCreate,
      update: mocks.packageUpdate,
      count: mocks.packageCount,
    },
    lane: { count: mocks.laneCount },
    user: {
      findMany: mocks.userFindMany,
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
      update: mocks.userUpdate,
      count: mocks.userCount,
    },
    auditLog: {
      findMany: mocks.auditFindMany,
      count: mocks.auditCount,
    },
    promoCode: {
      findMany: mocks.promoFindMany,
      findFirst: mocks.promoFindFirst,
      findUnique: mocks.promoFindUnique,
      create: mocks.promoCreate,
      update: mocks.promoUpdate,
    },
    booking: { findMany: mocks.bookingFindMany },
    payment: { aggregate: mocks.paymentAggregate },
    $transaction: mocks.txMock,
  },
}))

import {
  archivePackageAction,
  createPackageAction,
  createPromoAction,
  createTeamUserAction,
  deactivatePromoAction,
  deactivateTeamUserAction,
  getOperatingHours,
  getPromoForAdmin,
  getReportsSummary,
  getTenantForAdmin,
  listAuditLogs,
  listPackagesForAdmin,
  listPromosForAdmin,
  listTeamForAdmin,
  resetUserPasswordAction,
  updateOperatingHoursAction,
  updatePackageAction,
  updatePromoAction,
  updateTeamUserAction,
  updateTenantAction,
} from './admin'

function adminUser() {
  return {
    id: 'user_admin',
    email: 'admin@royalz.local',
    name: 'Admin',
    role: 'ADMIN',
  }
}
function managerUser() {
  return {
    id: 'user_mgr',
    email: 'mgr@royalz.local',
    name: 'Manager',
    role: 'MANAGER',
  }
}

function staffUser() {
  return {
    id: 'user_staff',
    email: 'staff@royalz.local',
    name: 'Staff',
    role: 'STAFF',
  }
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => {
    if (typeof m === 'function' && 'mockReset' in m) {
      ;(m as ReturnType<typeof vi.fn>).mockReset()
    }
  })
  mocks.isDevWithoutDbMock.mockReturnValue(false)
  mocks.requireRoleMock.mockResolvedValue(adminUser())
  mocks.hashPasswordMock.mockResolvedValue('hashed:abc')
  mocks.laneCount.mockResolvedValue(12)
  mocks.packageCount.mockResolvedValue(0)
  mocks.userCount.mockResolvedValue(0)
  mocks.txMock.mockImplementation(
    async (fn) =>
      fn({
        tenant: {
          update: mocks.tenantUpdate,
          findUnique: mocks.tenantFindUnique,
        },
        operatingHours: {
          deleteMany: mocks.hoursDeleteMany,
          createMany: mocks.hoursCreateMany,
        },
        package: {
          create: mocks.packageCreate,
          update: mocks.packageUpdate,
        },
        promoCode: {
          findMany: mocks.promoFindMany,
          findFirst: mocks.promoFindFirst,
          findUnique: mocks.promoFindUnique,
          create: mocks.promoCreate,
          update: mocks.promoUpdate,
        },
        user: { create: mocks.userCreate, update: mocks.userUpdate },
        auditLog: { create: mocks.auditCreate },
        booking: { findMany: mocks.bookingFindMany },
        payment: { aggregate: mocks.paymentAggregate },
      } as Parameters<typeof fn>[0]),
  )
  mocks.bookingFindMany.mockResolvedValue([])
  mocks.paymentAggregate.mockResolvedValue({ _sum: { refundAmount: null } })
})

describe('admin actions: role gating', () => {
  it('reads require MANAGER or ADMIN except operating hours (STAFF view-only)', async () => {
    mocks.tenantFindUnique.mockResolvedValue(null)
    mocks.hoursFindMany.mockResolvedValue([])
    mocks.packageFindMany.mockResolvedValue([])
    mocks.promoFindMany.mockResolvedValue([])
    mocks.userFindMany.mockResolvedValue([])
    await getTenantForAdmin('t1')
    await getOperatingHours('t1')
    await listPackagesForAdmin('t1')
    await listPromosForAdmin('t1')
    await listTeamForAdmin('t1')
    expect(mocks.requireRoleMock).toHaveBeenCalledTimes(5)
    expect(mocks.requireRoleMock.mock.calls[0]).toEqual(['MANAGER', 'ADMIN'])
    expect(mocks.requireRoleMock.mock.calls[1]).toEqual([
      'STAFF',
      'MANAGER',
      'ADMIN',
    ])
    for (const call of mocks.requireRoleMock.mock.calls.slice(2)) {
      expect(call).toEqual(['MANAGER', 'ADMIN'])
    }
  })
})

describe('updateTenantAction', () => {
  const baseInput = {
    tenantId: 't1',
    name: 'X',
    address: 'a',
    phone: 'p',
    timezone: 'America/New_York',
    themeSlug: 'default',
    holdTimeoutMins: 10,
    maxOnlineBowlers: 18,
    cancellationWindowHours: 24,
    cancellationRefundPercent: 100,
  }

  it('rejects empty name', async () => {
    await expect(
      updateTenantAction({ ...baseInput, name: '   ' }),
    ).rejects.toThrow(/name/i)
  })

  it('rejects out-of-range holdTimeoutMins', async () => {
    await expect(
      updateTenantAction({ ...baseInput, holdTimeoutMins: 0 }),
    ).rejects.toThrow(/holdTimeoutMins/i)
  })

  it('rejects maxOnlineBowlers > 36', async () => {
    await expect(
      updateTenantAction({ ...baseInput, maxOnlineBowlers: 100 }),
    ).rejects.toThrow(/maxOnlineBowlers/i)
  })

  it('rejects negative cancellationWindowHours', async () => {
    await expect(
      updateTenantAction({ ...baseInput, cancellationWindowHours: -1 }),
    ).rejects.toThrow(/cancellationWindowHours/i)
  })

  it('rejects cancellationWindowHours > 240', async () => {
    await expect(
      updateTenantAction({ ...baseInput, cancellationWindowHours: 999 }),
    ).rejects.toThrow(/cancellationWindowHours/i)
  })

  it('rejects cancellationRefundPercent outside 0..100', async () => {
    await expect(
      updateTenantAction({ ...baseInput, cancellationRefundPercent: 150 }),
    ).rejects.toThrow(/cancellationRefundPercent/i)
    await expect(
      updateTenantAction({ ...baseInput, cancellationRefundPercent: -5 }),
    ).rejects.toThrow(/cancellationRefundPercent/i)
  })

  it('rejects non-integer policy values', async () => {
    await expect(
      updateTenantAction({ ...baseInput, cancellationWindowHours: 24.5 }),
    ).rejects.toThrow(/cancellationWindowHours/i)
    await expect(
      updateTenantAction({ ...baseInput, cancellationRefundPercent: 50.5 }),
    ).rejects.toThrow(/cancellationRefundPercent/i)
  })

  it('rejects unknown theme slug', async () => {
    await expect(
      updateTenantAction({ ...baseInput, themeSlug: 'not-a-real-preset' }),
    ).rejects.toThrow(/themeSlug/i)
  })

  it('returns mocked result in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const r = await updateTenantAction({ ...baseInput })
    expect(r.mocked).toBe(true)
    expect(mocks.tenantUpdate).not.toHaveBeenCalled()
  })

  it('writes the Tenant + AuditLog rows, merging cancellation policy into config', async () => {
    mocks.tenantFindUnique.mockResolvedValue({
      config: {
        otherFutureKey: 'preserved',
        cancellationWindowHours: 12,
      },
    })
    mocks.tenantUpdate.mockResolvedValue({})
    await updateTenantAction({
      ...baseInput,
      name: '  New Name  ',
      address: 'New addr',
      phone: '(555)',
      timezone: 'America/Chicago',
      themeSlug: 'midnight',
      holdTimeoutMins: 15,
      maxOnlineBowlers: 24,
      cancellationWindowHours: 48,
      cancellationRefundPercent: 75,
    })
    expect(mocks.tenantUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: expect.objectContaining({
        name: 'New Name',
        timezone: 'America/Chicago',
        themeSlug: 'midnight',
        holdTimeoutMins: 15,
        maxOnlineBowlers: 24,
        cancellationWindowHours: 48,
        cancellationRefundPercent: 75,
        config: {
          otherFutureKey: 'preserved',
          cancellationWindowHours: 48,
          cancellationRefundPercent: 75,
        },
      }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_admin',
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: 't1',
        details: expect.objectContaining({
          themeSlug: 'midnight',
          cancellationWindowHours: 48,
          cancellationRefundPercent: 75,
        }),
      }),
    })
  })

  it('writes themeSlug to Tenant column and audit details', async () => {
    mocks.tenantFindUnique.mockResolvedValue({ config: {} })
    mocks.tenantUpdate.mockResolvedValue({})
    await updateTenantAction({ ...baseInput, themeSlug: 'sunset' })
    expect(mocks.tenantUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: expect.objectContaining({ themeSlug: 'sunset' }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: expect.objectContaining({ themeSlug: 'sunset' }),
      }),
    })
  })

  it('writes default config when no prior config row exists', async () => {
    mocks.tenantFindUnique.mockResolvedValue({ config: null })
    mocks.tenantUpdate.mockResolvedValue({})
    await updateTenantAction({ ...baseInput })
    expect(mocks.tenantUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: expect.objectContaining({
        config: {
          cancellationWindowHours: 24,
          cancellationRefundPercent: 100,
        },
      }),
    })
  })
})

describe('getTenantForAdmin', () => {
  it('returns defaulted cancellation policy when Tenant.config is missing keys', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.tenantFindUnique.mockResolvedValue({
      id: 't1',
      name: 'X',
      slug: 'x',
      address: 'a',
      phone: 'p',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      cancellationWindowHours: 24,
      cancellationRefundPercent: 100,
      config: null,
    })
    const out = await getTenantForAdmin('t1')
    expect(out?.cancellationWindowHours).toBe(24)
    expect(out?.cancellationRefundPercent).toBe(100)
  })

  it('returns cancellation policy values from typed Tenant columns', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.tenantFindUnique.mockResolvedValue({
      id: 't1',
      name: 'X',
      slug: 'x',
      address: 'a',
      phone: 'p',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      cancellationWindowHours: 12,
      cancellationRefundPercent: 50,
      config: {},
    })
    const out = await getTenantForAdmin('t1')
    expect(out?.cancellationWindowHours).toBe(12)
    expect(out?.cancellationRefundPercent).toBe(50)
  })

  it('returns typed Tenant column defaults when values are out of range', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.tenantFindUnique.mockResolvedValue({
      id: 't1',
      name: 'X',
      slug: 'x',
      address: 'a',
      phone: 'p',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      cancellationWindowHours: -5,
      cancellationRefundPercent: 200,
      config: {},
    })
    const out = await getTenantForAdmin('t1')
    expect(out?.cancellationWindowHours).toBe(-5)
    expect(out?.cancellationRefundPercent).toBe(200)
  })
})

describe('updateOperatingHoursAction', () => {
  function sevenDays(): Parameters<typeof updateOperatingHoursAction>[0]['hours'] {
    return Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      openTime: '14:00',
      closeTime: '23:00',
      closed: false,
    }))
  }

  it('rejects when hours length != 7', async () => {
    await expect(
      updateOperatingHoursAction({
        tenantId: 't1',
        hours: sevenDays().slice(0, 6),
      }),
    ).rejects.toThrow(/7 day/i)
  })

  it('rejects invalid time format', async () => {
    const bad = sevenDays()
    bad[3].openTime = '9am'
    await expect(
      updateOperatingHoursAction({ tenantId: 't1', hours: bad }),
    ).rejects.toThrow(/HH:MM/i)
  })

  it('allows closed days to skip time validation', async () => {
    const hours = sevenDays()
    hours[2] = { dayOfWeek: 2, openTime: '', closeTime: '', closed: true }
    mocks.hoursDeleteMany.mockResolvedValue({})
    mocks.hoursCreateMany.mockResolvedValue({})
    await expect(
      updateOperatingHoursAction({ tenantId: 't1', hours }),
    ).resolves.toEqual({ mocked: false })
  })

  it('replaces all rows in a single transaction', async () => {
    const hours = sevenDays()
    mocks.hoursDeleteMany.mockResolvedValue({})
    mocks.hoursCreateMany.mockResolvedValue({})
    await updateOperatingHoursAction({ tenantId: 't1', hours })
    expect(mocks.hoursDeleteMany).toHaveBeenCalledWith({
      where: { tenantId: 't1' },
    })
    expect(mocks.hoursCreateMany).toHaveBeenCalledWith({
      data: hours.map((h) => ({ ...h, tenantId: 't1' })),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'OPERATING_HOURS_UPDATED' }),
    })
  })
})

describe('package CRUD', () => {
  const basePackage = {
    name: 'Test pkg',
    description: 'desc',
    basePrice: 4000,
    gameIncluded: true,
    shoesIncluded: true,
    gameCostPer: null,
    shoeCostPer: null,
    partyTypes: ['OPEN'] as Array<'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'>,
    active: true,
    sortOrder: 1,
  }

  it('createPackageAction rejects missing name', async () => {
    await expect(
      createPackageAction('t1', { ...basePackage, name: '' }),
    ).rejects.toThrow(/name/i)
  })

  it('createPackageAction rejects empty partyTypes', async () => {
    await expect(
      createPackageAction('t1', { ...basePackage, partyTypes: [] }),
    ).rejects.toThrow(/party type/i)
  })

  it('createPackageAction requires gameCostPer when gameIncluded is false', async () => {
    await expect(
      createPackageAction('t1', {
        ...basePackage,
        gameIncluded: false,
        gameCostPer: null,
      }),
    ).rejects.toThrow(/gameCostPer/i)
  })

  it('createPackageAction writes Package + AuditLog', async () => {
    mocks.packageCreate.mockResolvedValue({ id: 'pkg_new' })
    const result = await createPackageAction('t1', basePackage)
    expect(result.packageId).toBe('pkg_new')
    expect(mocks.packageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 't1',
        name: 'Test pkg',
        basePrice: 4000,
        gameCostPer: null,
        shoeCostPer: null,
        partyTypes: ['OPEN'],
      }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PACKAGE_CREATED' }),
    })
  })

  it('createPackageAction returns mock id in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const result = await createPackageAction('t1', basePackage)
    expect(result.mocked).toBe(true)
    expect(mocks.packageCreate).not.toHaveBeenCalled()
  })

  it('updatePackageAction nulls gameCostPer when gameIncluded is true', async () => {
    mocks.packageUpdate.mockResolvedValue({})
    await updatePackageAction('pkg_1', {
      ...basePackage,
      gameIncluded: true,
      gameCostPer: 999,
      shoesIncluded: false,
      shoeCostPer: 500,
    })
    expect(mocks.packageUpdate).toHaveBeenCalledWith({
      where: { id: 'pkg_1' },
      data: expect.objectContaining({
        gameCostPer: null,
        shoeCostPer: 500,
      }),
    })
  })

  it('archivePackageAction sets active=false', async () => {
    mocks.packageUpdate.mockResolvedValue({})
    await archivePackageAction('pkg_1')
    expect(mocks.packageUpdate).toHaveBeenCalledWith({
      where: { id: 'pkg_1' },
      data: { active: false },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PACKAGE_ARCHIVED' }),
    })
  })
})

describe('team CRUD', () => {
  it('createTeamUserAction rejects invalid email', async () => {
    await expect(
      createTeamUserAction({
        tenantId: 't1',
        email: 'not-an-email',
        role: 'STAFF',
        initialPassword: 'longenough',
      }),
    ).rejects.toThrow(/email/i)
  })

  it('createTeamUserAction rejects short password', async () => {
    await expect(
      createTeamUserAction({
        tenantId: 't1',
        email: 'a@b.co',
        role: 'STAFF',
        initialPassword: 'short',
      }),
    ).rejects.toThrow(/password/i)
  })

  it('createTeamUserAction rejects role=ADMIN when caller is MANAGER', async () => {
    mocks.requireRoleMock.mockResolvedValue(managerUser())
    await expect(
      createTeamUserAction({
        tenantId: 't1',
        email: 'a@b.co',
        role: 'ADMIN',
        initialPassword: 'longenough',
      }),
    ).rejects.toThrow(/ADMIN/)
  })

  it('createTeamUserAction hashes the password before insert', async () => {
    mocks.userCreate.mockResolvedValue({ id: 'user_new' })
    await createTeamUserAction({
      tenantId: 't1',
      email: 'New@Example.com',
      name: '  Casey  ',
      role: 'STAFF',
      initialPassword: 'longenoughpw',
    })
    expect(mocks.hashPasswordMock).toHaveBeenCalledWith('longenoughpw')
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'new@example.com',
        name: 'Casey',
        passwordHash: 'hashed:abc',
        role: 'STAFF',
      }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'TEAM_USER_CREATED' }),
    })
  })

  it('updateTeamUserAction rejects self-role-change', async () => {
    await expect(
      updateTeamUserAction({
        userId: 'user_admin',
        role: 'STAFF',
      }),
    ).rejects.toThrow(/own role/i)
  })

  it('updateTeamUserAction allows non-self role change', async () => {
    mocks.userUpdate.mockResolvedValue({})
    await updateTeamUserAction({
      userId: 'user_someone_else',
      name: 'Renamed',
      role: 'MANAGER',
    })
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user_someone_else' },
      data: expect.objectContaining({ role: 'MANAGER' }),
    })
  })

  it('resetUserPasswordAction rejects short passwords', async () => {
    await expect(
      resetUserPasswordAction({ userId: 'user_1', newPassword: 'short' }),
    ).rejects.toThrow(/password/i)
  })

  it('resetUserPasswordAction hashes and writes', async () => {
    mocks.userUpdate.mockResolvedValue({})
    await resetUserPasswordAction({
      userId: 'user_1',
      newPassword: 'longenoughpw',
    })
    expect(mocks.hashPasswordMock).toHaveBeenCalledWith('longenoughpw')
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { passwordHash: 'hashed:abc' },
    })
  })

  it('deactivateTeamUserAction rejects self-deactivation', async () => {
    await expect(deactivateTeamUserAction('user_admin')).rejects.toThrow(
      /yourself/i,
    )
  })

  it('deactivateTeamUserAction demotes to CUSTOMER and nulls password', async () => {
    mocks.userUpdate.mockResolvedValue({})
    await deactivateTeamUserAction('user_someone_else')
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user_someone_else' },
      data: { role: 'CUSTOMER', passwordHash: null },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'TEAM_USER_DEACTIVATED' }),
    })
  })
})

describe('listAuditLogs', () => {
  let auditAuthUser: ReturnType<typeof adminUser> | ReturnType<typeof managerUser> | ReturnType<typeof staffUser> | null

  beforeEach(() => {
    auditAuthUser = adminUser()
    mocks.requireRoleMock.mockImplementation(async (...allowed: string[]) => {
      if (auditAuthUser === null) {
        throw new Error('__redirect:/signin')
      }
      if (!allowed.includes(auditAuthUser.role)) {
        throw new Error('__unauthorized')
      }
      return auditAuthUser
    })
    mocks.auditFindMany.mockResolvedValue([])
    mocks.auditCount.mockResolvedValue(0)
    mocks.userFindMany.mockResolvedValue([])
  })

  it('rejects when unauthenticated (requireRole)', async () => {
    auditAuthUser = null
    await expect(listAuditLogs({})).rejects.toThrow('__redirect')
  })

  it('rejects for MANAGER role (ADMIN-only)', async () => {
    auditAuthUser = managerUser()
    await expect(listAuditLogs({})).rejects.toThrow('__unauthorized')
  })

  it('rejects for STAFF role', async () => {
    auditAuthUser = staffUser()
    await expect(listAuditLogs({})).rejects.toThrow('__unauthorized')
  })

  it('succeeds for ADMIN role with Prisma', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([
      {
        id: 'a1',
        bookingId: null,
        userId: 'user_admin',
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: 't1',
        details: { x: 1 },
        createdAt: new Date('2026-01-01T12:00:00Z'),
      },
    ])
    mocks.auditCount.mockResolvedValue(1)
    mocks.userFindMany.mockResolvedValue([
      { id: 'user_admin', name: 'Admin', email: 'admin@royalz.local' },
    ])
    const page = await listAuditLogs({})
    expect(page.entries).toHaveLength(1)
    expect(page.entries[0].userName).toBe('Admin')
    expect(page.entries[0].userEmail).toBe('admin@royalz.local')
    expect(mocks.requireRoleMock).toHaveBeenCalledWith('ADMIN')
  })

  it('returns deterministic mock entries in dev-without-db', async () => {
    auditAuthUser = adminUser()
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const page = await listAuditLogs({})
    expect(page.entries.length).toBeGreaterThanOrEqual(5)
    expect(page.entries.length).toBeLessThanOrEqual(10)
    expect(page.total).toBe(page.entries.length)
    expect(page.hasMore).toBe(false)
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(50)
    expect(mocks.auditFindMany).not.toHaveBeenCalled()
  })

  it('defaults to page 1 and pageSize 50; hasMore false when total <= pageSize', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([
      {
        id: 'a1',
        bookingId: null,
        userId: null,
        action: 'X',
        entityType: 'Tenant',
        entityId: 't1',
        details: null,
        createdAt: new Date(),
      },
    ])
    mocks.auditCount.mockResolvedValue(1)
    const page = await listAuditLogs({})
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(50)
    expect(page.hasMore).toBe(false)
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    )
  })

  it('uses skip 10 when page=2 and pageSize=10', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([])
    mocks.auditCount.mockResolvedValue(25)
    await listAuditLogs({ page: 2, pageSize: 10 })
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    )
  })

  it('passes action filter to Prisma where', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([])
    mocks.auditCount.mockResolvedValue(0)
    await listAuditLogs({ action: 'TENANT_UPDATED' })
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'TENANT_UPDATED' }),
      }),
    )
    expect(mocks.auditCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'TENANT_UPDATED' }),
      }),
    )
  })

  it('passes entityType filter to Prisma where', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([])
    mocks.auditCount.mockResolvedValue(0)
    await listAuditLogs({ entityType: 'Booking' })
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityType: 'Booking' }),
      }),
    )
  })

  it('passes date range as createdAt gte/lte in where', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([])
    mocks.auditCount.mockResolvedValue(0)
    const startDate = new Date('2026-01-01T00:00:00Z')
    const endDate = new Date('2026-12-31T23:59:59Z')
    await listAuditLogs({ startDate, endDate })
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: startDate, lte: endDate },
        }),
      }),
    )
  })

  it('loads users by distinct ids from audit rows', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([
      {
        id: 'a1',
        bookingId: null,
        userId: 'u_shared',
        action: 'X',
        entityType: 'Tenant',
        entityId: 't1',
        details: null,
        createdAt: new Date(),
      },
      {
        id: 'a2',
        bookingId: null,
        userId: 'u_shared',
        action: 'Y',
        entityType: 'Tenant',
        entityId: 't2',
        details: null,
        createdAt: new Date(),
      },
    ])
    mocks.auditCount.mockResolvedValue(2)
    mocks.userFindMany.mockResolvedValue([
      { id: 'u_shared', name: 'Sam', email: 'sam@example.com' },
    ])
    const page = await listAuditLogs({})
    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['u_shared'] } },
      select: { id: true, name: true, email: true },
    })
    expect(page.entries.every((e) => e.userName === 'Sam')).toBe(true)
    expect(page.entries.every((e) => e.userEmail === 'sam@example.com')).toBe(
      true,
    )
  })

  it('returns null userName and userEmail when userId is null', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([
      {
        id: 'a1',
        bookingId: null,
        userId: null,
        action: 'BOOKING_CUSTOMER_CANCELLED',
        entityType: 'Booking',
        entityId: 'b1',
        details: null,
        createdAt: new Date(),
      },
    ])
    mocks.auditCount.mockResolvedValue(1)
    const page = await listAuditLogs({})
    expect(mocks.userFindMany).not.toHaveBeenCalled()
    expect(page.entries[0].userName).toBeNull()
    expect(page.entries[0].userEmail).toBeNull()
  })

  it('returns null userName when user was deleted (not in lookup)', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([
      {
        id: 'a1',
        bookingId: null,
        userId: 'missing_user',
        action: 'X',
        entityType: 'Tenant',
        entityId: 't1',
        details: null,
        createdAt: new Date(),
      },
    ])
    mocks.auditCount.mockResolvedValue(1)
    mocks.userFindMany.mockResolvedValue([])
    const page = await listAuditLogs({})
    expect(page.entries[0].userName).toBeNull()
    expect(page.entries[0].userEmail).toBeNull()
  })

  it('clamps pageSize above 200 to 200', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([])
    mocks.auditCount.mockResolvedValue(0)
    const page = await listAuditLogs({ pageSize: 500 })
    expect(page.pageSize).toBe(200)
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    )
  })

  it('throws when pageSize < 1', async () => {
    auditAuthUser = adminUser()
    await expect(listAuditLogs({ pageSize: 0 })).rejects.toThrow(/pageSize/i)
  })

  it('passes userId filter to Prisma where', async () => {
    auditAuthUser = adminUser()
    mocks.auditFindMany.mockResolvedValue([])
    mocks.auditCount.mockResolvedValue(0)
    await listAuditLogs({ userId: 'u_filter' })
    expect(mocks.auditFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u_filter' }),
      }),
    )
  })
})

describe('getReportsSummary', () => {
  let reportsAuthUser: ReturnType<typeof adminUser> | ReturnType<typeof managerUser> | ReturnType<typeof staffUser> | null

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-06-01T12:00:00.000Z') })
    reportsAuthUser = adminUser()
    mocks.requireRoleMock.mockImplementation(async (...allowed: string[]) => {
      if (reportsAuthUser === null) {
        throw new Error('__redirect:/signin')
      }
      if (!allowed.includes(reportsAuthUser.role)) {
        throw new Error('__unauthorized')
      }
      return reportsAuthUser
    })
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.paymentAggregate.mockResolvedValue({ _sum: { refundAmount: null } })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('rejects when unauthenticated (requireRole)', async () => {
    reportsAuthUser = null
    await expect(getReportsSummary('t1', '30d')).rejects.toThrow('__redirect')
  })

  it('rejects for MANAGER role (ADMIN-only)', async () => {
    reportsAuthUser = managerUser()
    await expect(getReportsSummary('t1', '30d')).rejects.toThrow('__unauthorized')
  })

  it('rejects for STAFF role', async () => {
    reportsAuthUser = staffUser()
    await expect(getReportsSummary('t1', '30d')).rejects.toThrow('__unauthorized')
  })

  it('calls requireRole with ADMIN for ADMIN user', async () => {
    reportsAuthUser = adminUser()
    await getReportsSummary('t1', '30d')
    expect(mocks.requireRoleMock).toHaveBeenCalledWith('ADMIN')
  })

  it('returns deterministic mock summary in dev-without-db', async () => {
    reportsAuthUser = adminUser()
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const s = await getReportsSummary('tenant_dev_mock', '30d')
    expect(s.range).toBe('30d')
    expect(s.daily.length).toBe(30)
    expect(s.topPackages).toHaveLength(5)
    expect(s.kpi.bookingCount).toBeGreaterThan(0)
    expect(mocks.txMock).not.toHaveBeenCalled()
    expect(mocks.bookingFindMany).not.toHaveBeenCalled()
  })

  it('returns mock summary when Prisma cannot connect in dev', async () => {
    reportsAuthUser = adminUser()
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.bookingFindMany.mockRejectedValue(
      Object.assign(new Error("Can't reach database server"), { code: 'P1001' }),
    )
    const s = await getReportsSummary('t1', '30d')
    expect(s.range).toBe('30d')
    expect(s.kpi.bookingCount).toBeGreaterThan(0)
  })

  it("maps invalid range input to '30d'", async () => {
    reportsAuthUser = adminUser()
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const s = await getReportsSummary('t1', 'nope')
    expect(s.range).toBe('30d')
  })

  it('aggregates daily revenue and counts from Prisma rows', async () => {
    reportsAuthUser = adminUser()
    mocks.bookingFindMany.mockResolvedValue([
      {
        id: 'b1',
        startTime: new Date('2026-05-15T18:00:00.000Z'),
        totalAmount: 4000,
        status: 'CONFIRMED',
        packageId: 'p1',
        payment: { status: 'succeeded' },
        package: { id: 'p1', name: 'Pkg A' },
      },
      {
        id: 'b2',
        startTime: new Date('2026-05-15T20:00:00.000Z'),
        totalAmount: 5000,
        status: 'COMPLETED',
        packageId: 'p1',
        payment: { status: 'cash' },
        package: { id: 'p1', name: 'Pkg A' },
      },
      {
        id: 'b3',
        startTime: new Date('2026-05-20T10:00:00.000Z'),
        totalAmount: 3000,
        status: 'CONFIRMED',
        packageId: 'p2',
        payment: { status: 'succeeded' },
        package: { id: 'p2', name: 'Pkg B' },
      },
      {
        id: 'b_unpaid',
        startTime: new Date('2026-05-16T10:00:00.000Z'),
        totalAmount: 9999,
        status: 'CONFIRMED',
        packageId: 'p9',
        payment: { status: 'requires_payment_method' },
        package: { id: 'p9', name: 'Ghost' },
      },
    ])
    mocks.paymentAggregate.mockResolvedValue({ _sum: { refundAmount: 1500 } })

    const s = await getReportsSummary('t1', '30d')

    expect(s.kpi.grossRevenueCents).toBe(4000 + 5000 + 3000)
    expect(s.kpi.bookingCount).toBe(3)
    expect(s.kpi.refundTotalCents).toBe(1500)
    expect(s.kpi.averageBookingCents).toBe(Math.floor(12_000 / 3))

    const may15 = s.daily.find((d) => d.date === '2026-05-15')
    expect(may15?.revenueCents).toBe(9000)
    expect(may15?.bookingCount).toBe(2)

    const may20 = s.daily.find((d) => d.date === '2026-05-20')
    expect(may20?.revenueCents).toBe(3000)
    expect(may20?.bookingCount).toBe(1)
  })

  it('ranks top packages by revenue and caps at five', async () => {
    reportsAuthUser = adminUser()
    const rows = [1, 2, 3, 4, 5, 6].map((i) => ({
      id: `b_${i}`,
      startTime: new Date('2026-05-28T12:00:00.000Z'),
      totalAmount: i * 1000,
      status: 'CONFIRMED' as const,
      packageId: `p_${i}`,
      payment: { status: 'succeeded' as const },
      package: { id: `p_${i}`, name: `Package ${i}` },
    }))
    mocks.bookingFindMany.mockResolvedValue(rows)

    const s = await getReportsSummary('t1', '7d')

    expect(s.topPackages).toHaveLength(5)
    expect(s.topPackages[0].packageId).toBe('p_6')
    expect(s.topPackages[0].revenueCents).toBe(6000)
    expect(s.topPackages[4].packageId).toBe('p_2')
  })

  it('returns zeros for KPIs and filled daily zeros when there are no paid bookings', async () => {
    reportsAuthUser = adminUser()
    mocks.bookingFindMany.mockResolvedValue([
      {
        id: 'b_hold',
        startTime: new Date('2026-05-30T12:00:00.000Z'),
        totalAmount: 100,
        status: 'CANCELLED',
        packageId: 'p1',
        payment: null,
        package: { id: 'p1', name: 'X' },
      },
    ])
    mocks.paymentAggregate.mockResolvedValue({ _sum: { refundAmount: null } })

    const s = await getReportsSummary('t1', '7d')

    expect(s.kpi.grossRevenueCents).toBe(0)
    expect(s.kpi.bookingCount).toBe(0)
    expect(s.kpi.refundTotalCents).toBe(0)
    expect(s.kpi.averageBookingCents).toBe(0)
    expect(s.topPackages).toHaveLength(0)
    expect(s.daily.every((d) => d.revenueCents === 0 && d.bookingCount === 0)).toBe(
      true,
    )
  })
})

describe('promo admin actions', () => {
  const baseInput = {
    tenantId: 't1',
    code: 'SAVE10',
    description: 'Save',
    discountType: 'PERCENT' as const,
    discountValue: 10,
    maxUses: null as number | null,
    expiresAt: null as Date | null,
  }

  it('rejects STAFF for listPromosForAdmin', async () => {
    mocks.requireRoleMock.mockRejectedValueOnce(new Error('__unauthorized'))
    await expect(listPromosForAdmin('t1')).rejects.toThrow('__unauthorized')
  })

  it('listPromosForAdmin reads from prisma', async () => {
    mocks.promoFindMany.mockResolvedValue([])
    const rows = await listPromosForAdmin('t1')
    expect(rows).toEqual([])
    expect(mocks.promoFindMany).toHaveBeenCalled()
  })

  it('getPromoForAdmin returns null when missing', async () => {
    mocks.promoFindUnique.mockResolvedValue(null)
    const row = await getPromoForAdmin('missing')
    expect(row).toBeNull()
  })

  it('createPromoAction writes audit in transaction', async () => {
    mocks.promoFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    mocks.promoCreate.mockResolvedValue({ id: 'promo_new' })
    const result = await createPromoAction(baseInput)
    expect(result.id).toBe('promo_new')
    expect(result.mocked).toBe(false)
    expect(mocks.promoCreate).toHaveBeenCalled()
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PROMO_CREATED' }),
    })
  })

  it('createPromoAction rejects duplicate active code', async () => {
    mocks.promoFindFirst.mockResolvedValue({ id: 'x', active: true })
    await expect(createPromoAction(baseInput)).rejects.toThrow(/already exists/i)
  })

  it('createPromoAction rejects inactive code collision', async () => {
    mocks.promoFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'x', active: false })
    await expect(createPromoAction(baseInput)).rejects.toThrow(/inactive/i)
  })

  it('createPromoAction validates code pattern', async () => {
    await expect(
      createPromoAction({ ...baseInput, code: 'ab' }),
    ).rejects.toThrow(/promo:/i)
  })

  it('createPromoAction returns mocked in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const result = await createPromoAction(baseInput)
    expect(result.mocked).toBe(true)
    expect(mocks.promoCreate).not.toHaveBeenCalled()
  })

  it('updatePromoAction writes PROMO_UPDATED audit', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.promoFindUnique.mockResolvedValue({
      id: 'p1',
      tenantId: 't1',
    })
    await updatePromoAction({ ...baseInput, id: 'p1', code: 'OTHER' })
    expect(mocks.promoUpdate).toHaveBeenCalled()
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PROMO_UPDATED' }),
    })
  })

  it('deactivatePromoAction sets active false and audits', async () => {
    await deactivatePromoAction('p1')
    expect(mocks.promoUpdate).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { active: false },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PROMO_DEACTIVATED' }),
    })
  })
})
