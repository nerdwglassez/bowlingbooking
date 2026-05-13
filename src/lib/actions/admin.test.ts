import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tenantUpdate = vi.fn()
  const tenantFindUnique = vi.fn()
  const hoursDeleteMany = vi.fn()
  const hoursCreateMany = vi.fn()
  const hoursFindMany = vi.fn()
  const packageCreate = vi.fn()
  const packageUpdate = vi.fn()
  const packageFindMany = vi.fn()
  const packageFindUnique = vi.fn()
  const userCreate = vi.fn()
  const userUpdate = vi.fn()
  const userFindMany = vi.fn()
  const userFindUnique = vi.fn()
  const auditCreate = vi.fn()
  const auditFindMany = vi.fn()
  const auditCount = vi.fn()
  const txStub = {
    tenant: { update: tenantUpdate },
    operatingHours: {
      deleteMany: hoursDeleteMany,
      createMany: hoursCreateMany,
    },
    package: { create: packageCreate, update: packageUpdate },
    user: { create: userCreate, update: userUpdate },
    auditLog: { create: auditCreate },
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
    packageFindMany,
    packageFindUnique,
    userCreate,
    userUpdate,
    userFindMany,
    userFindUnique,
    auditCreate,
    auditFindMany,
    auditCount,
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({
  requireRole: mocks.requireRoleMock,
  hashPassword: mocks.hashPasswordMock,
}))
vi.mock('@/lib/env', () => ({ isDevWithoutDb: mocks.isDevWithoutDbMock }))
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
    },
    user: {
      findMany: mocks.userFindMany,
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
      update: mocks.userUpdate,
    },
    auditLog: {
      findMany: mocks.auditFindMany,
      count: mocks.auditCount,
    },
    $transaction: mocks.txMock,
  },
}))

import {
  archivePackageAction,
  createPackageAction,
  createTeamUserAction,
  deactivateTeamUserAction,
  getOperatingHours,
  getTenantForAdmin,
  listAuditLogs,
  listPackagesForAdmin,
  listTeamForAdmin,
  resetUserPasswordAction,
  updateOperatingHoursAction,
  updatePackageAction,
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
  mocks.txMock.mockImplementation(
    async (fn) =>
      fn({
        tenant: { update: mocks.tenantUpdate },
        operatingHours: {
          deleteMany: mocks.hoursDeleteMany,
          createMany: mocks.hoursCreateMany,
        },
        package: {
          create: mocks.packageCreate,
          update: mocks.packageUpdate,
        },
        user: { create: mocks.userCreate, update: mocks.userUpdate },
        auditLog: { create: mocks.auditCreate },
      } as Parameters<typeof fn>[0]),
  )
})

describe('admin actions: role gating', () => {
  it('every read requires MANAGER or ADMIN', async () => {
    mocks.tenantFindUnique.mockResolvedValue(null)
    mocks.hoursFindMany.mockResolvedValue([])
    mocks.packageFindMany.mockResolvedValue([])
    mocks.userFindMany.mockResolvedValue([])
    await getTenantForAdmin('t1')
    await getOperatingHours('t1')
    await listPackagesForAdmin('t1')
    await listTeamForAdmin('t1')
    expect(mocks.requireRoleMock).toHaveBeenCalledTimes(4)
    for (const call of mocks.requireRoleMock.mock.calls) {
      expect(call).toEqual(['MANAGER', 'ADMIN'])
    }
  })
})

describe('updateTenantAction', () => {
  it('rejects empty name', async () => {
    await expect(
      updateTenantAction({
        tenantId: 't1',
        name: '   ',
        address: 'a',
        phone: 'p',
        timezone: 'America/New_York',
        holdTimeoutMins: 10,
        maxOnlineBowlers: 18,
      }),
    ).rejects.toThrow(/name/i)
  })

  it('rejects out-of-range holdTimeoutMins', async () => {
    await expect(
      updateTenantAction({
        tenantId: 't1',
        name: 'X',
        address: 'a',
        phone: 'p',
        timezone: 'America/New_York',
        holdTimeoutMins: 0,
        maxOnlineBowlers: 18,
      }),
    ).rejects.toThrow(/holdTimeoutMins/i)
  })

  it('rejects maxOnlineBowlers > 36', async () => {
    await expect(
      updateTenantAction({
        tenantId: 't1',
        name: 'X',
        address: 'a',
        phone: 'p',
        timezone: 'America/New_York',
        holdTimeoutMins: 10,
        maxOnlineBowlers: 100,
      }),
    ).rejects.toThrow(/maxOnlineBowlers/i)
  })

  it('returns mocked result in dev-without-db', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const r = await updateTenantAction({
      tenantId: 't1',
      name: 'X',
      address: 'a',
      phone: 'p',
      timezone: 'America/New_York',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
    })
    expect(r.mocked).toBe(true)
    expect(mocks.tenantUpdate).not.toHaveBeenCalled()
  })

  it('writes the Tenant + AuditLog rows', async () => {
    mocks.tenantUpdate.mockResolvedValue({})
    await updateTenantAction({
      tenantId: 't1',
      name: '  New Name  ',
      address: 'New addr',
      phone: '(555)',
      timezone: 'America/Chicago',
      holdTimeoutMins: 15,
      maxOnlineBowlers: 24,
    })
    expect(mocks.tenantUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: expect.objectContaining({
        name: 'New Name',
        timezone: 'America/Chicago',
        holdTimeoutMins: 15,
        maxOnlineBowlers: 24,
      }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_admin',
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: 't1',
      }),
    })
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
