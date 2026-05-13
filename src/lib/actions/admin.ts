'use server'

// admin.ts — Server actions for the admin settings shell.
//
// Every mutation action enforces MANAGER or ADMIN via `requireRole(...)`.
// `listAuditLogs` is read-only and ADMIN-only. Role-gating is server-side
// ONLY; never trust a client-side role claim.
//
// Dev-without-DB: reads return deterministic mock data so the admin app is
// reviewable without Postgres. Writes log + return a synthesized result
// with `mocked: true`.

import { revalidatePath } from 'next/cache'

import type { Prisma } from '@prisma/client'

import { hashPassword, requireRole, type CurrentUser } from '@/lib/auth'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'

// ── Shared types ──────────────────────────────────────────

export interface AdminTenantDetail {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  timezone: string
  themeSlug: string
  holdTimeoutMins: number
  maxOnlineBowlers: number
}

export interface AdminOperatingHour {
  id: string
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  openTime: string // "HH:MM"
  closeTime: string // "HH:MM"
  closed: boolean
}

export interface AdminPackageRow {
  id: string
  name: string
  description: string | null
  basePrice: number
  gameIncluded: boolean
  shoesIncluded: boolean
  gameCostPer: number | null
  shoeCostPer: number | null
  partyTypes: Array<'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'>
  active: boolean
  sortOrder: number
}

export interface AdminUserRow {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN'
  hasPassword: boolean
  createdAt: Date
}

// ── Venue / tenant ────────────────────────────────────────

export async function getTenantForAdmin(
  tenantId: string,
): Promise<AdminTenantDetail | null> {
  await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return {
      id: tenantId,
      name: 'Royal Z Lanes',
      slug: 'royalz',
      address: '123 Main Street, Anytown USA',
      phone: '(555) 555-0123',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
    }
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return null
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    address: tenant.address,
    phone: tenant.phone,
    timezone: tenant.timezone,
    themeSlug: tenant.themeSlug,
    holdTimeoutMins: tenant.holdTimeoutMins,
    maxOnlineBowlers: tenant.maxOnlineBowlers,
  }
}

export interface UpdateTenantInput {
  tenantId: string
  name: string
  address: string
  phone: string
  timezone: string
  holdTimeoutMins: number
  maxOnlineBowlers: number
}

export interface UpdateTenantResult {
  mocked: boolean
}

export async function updateTenantAction(
  input: UpdateTenantInput,
): Promise<UpdateTenantResult> {
  const user = await requireRole('MANAGER', 'ADMIN')

  if (!input.name.trim()) {
    throw new Error('updateTenantAction: name is required')
  }
  if (input.holdTimeoutMins < 1 || input.holdTimeoutMins > 60) {
    throw new Error(
      'updateTenantAction: holdTimeoutMins must be between 1 and 60',
    )
  }
  if (input.maxOnlineBowlers < 1 || input.maxOnlineBowlers > 36) {
    throw new Error(
      'updateTenantAction: maxOnlineBowlers must be between 1 and 36',
    )
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock tenant update by ${user.email}`, input)
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: input.tenantId },
      data: {
        name: input.name.trim(),
        address: input.address.trim(),
        phone: input.phone.trim(),
        timezone: input.timezone,
        holdTimeoutMins: input.holdTimeoutMins,
        maxOnlineBowlers: input.maxOnlineBowlers,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: input.tenantId,
        details: {
          name: input.name,
          address: input.address,
          phone: input.phone,
          timezone: input.timezone,
          holdTimeoutMins: input.holdTimeoutMins,
          maxOnlineBowlers: input.maxOnlineBowlers,
        },
      },
    })
  })

  revalidatePath('/admin')
  revalidatePath('/admin/venue')
  return { mocked: false }
}

// ── Operating hours ───────────────────────────────────────

export async function getOperatingHours(
  tenantId: string,
): Promise<AdminOperatingHour[]> {
  await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockOperatingHours()
  }
  const rows = await prisma.operatingHours.findMany({
    where: { tenantId },
    orderBy: { dayOfWeek: 'asc' },
  })
  return rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    openTime: r.openTime,
    closeTime: r.closeTime,
    closed: r.closed,
  }))
}

export interface UpdateOperatingHoursInput {
  tenantId: string
  hours: Array<{
    dayOfWeek: number
    openTime: string
    closeTime: string
    closed: boolean
  }>
}

export async function updateOperatingHoursAction(
  input: UpdateOperatingHoursInput,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')

  if (input.hours.length !== 7) {
    throw new Error('updateOperatingHoursAction: expected 7 day entries')
  }
  const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
  for (const h of input.hours) {
    if (h.dayOfWeek < 0 || h.dayOfWeek > 6) {
      throw new Error('updateOperatingHoursAction: dayOfWeek must be 0..6')
    }
    if (!h.closed && (!HHMM.test(h.openTime) || !HHMM.test(h.closeTime))) {
      throw new Error('updateOperatingHoursAction: times must be HH:MM 24h')
    }
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock hours update by ${user.email}`, input.hours)
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    await tx.operatingHours.deleteMany({ where: { tenantId: input.tenantId } })
    await tx.operatingHours.createMany({
      data: input.hours.map((h) => ({
        tenantId: input.tenantId,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        closed: h.closed,
      })),
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'OPERATING_HOURS_UPDATED',
        entityType: 'Tenant',
        entityId: input.tenantId,
        details: { hours: input.hours },
      },
    })
  })

  revalidatePath('/admin/venue')
  return { mocked: false }
}

// ── Packages ──────────────────────────────────────────────

export async function listPackagesForAdmin(
  tenantId: string,
): Promise<AdminPackageRow[]> {
  await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockPackages()
  }
  const rows = await prisma.package.findMany({
    where: { tenantId },
    orderBy: [{ active: 'desc' }, { sortOrder: 'asc' }],
  })
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    basePrice: p.basePrice,
    gameIncluded: p.gameIncluded,
    shoesIncluded: p.shoesIncluded,
    gameCostPer: p.gameCostPer,
    shoeCostPer: p.shoeCostPer,
    partyTypes: p.partyTypes,
    active: p.active,
    sortOrder: p.sortOrder,
  }))
}

export async function getPackageForAdmin(
  packageId: string,
): Promise<AdminPackageRow | null> {
  await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockPackages().find((p) => p.id === packageId) ?? null
  }
  const pkg = await prisma.package.findUnique({ where: { id: packageId } })
  if (!pkg) return null
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    basePrice: pkg.basePrice,
    gameIncluded: pkg.gameIncluded,
    shoesIncluded: pkg.shoesIncluded,
    gameCostPer: pkg.gameCostPer,
    shoeCostPer: pkg.shoeCostPer,
    partyTypes: pkg.partyTypes,
    active: pkg.active,
    sortOrder: pkg.sortOrder,
  }
}

export interface PackageInput {
  name: string
  description?: string | null
  basePrice: number
  gameIncluded: boolean
  shoesIncluded: boolean
  gameCostPer?: number | null
  shoeCostPer?: number | null
  partyTypes: Array<'OPEN' | 'BIRTHDAY' | 'CORPORATE' | 'COSMIC'>
  active: boolean
  sortOrder: number
}

function validatePackageInput(input: PackageInput): void {
  if (!input.name.trim()) {
    throw new Error('package: name is required')
  }
  if (input.basePrice < 0) {
    throw new Error('package: basePrice must be >= 0')
  }
  if (input.partyTypes.length === 0) {
    throw new Error('package: at least one party type is required')
  }
  if (!input.gameIncluded && input.gameCostPer == null) {
    throw new Error(
      'package: gameCostPer must be set when games are not included',
    )
  }
  if (!input.shoesIncluded && input.shoeCostPer == null) {
    throw new Error(
      'package: shoeCostPer must be set when shoes are not included',
    )
  }
}

export async function createPackageAction(
  tenantId: string,
  input: PackageInput,
): Promise<{ packageId: string; mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  validatePackageInput(input)

  if (isDevWithoutDb()) {
    console.log(`[admin] mock package create by ${user.email}`, input)
    return { packageId: `pkg_mock_${Date.now()}`, mocked: true }
  }

  const pkg = await prisma.$transaction(async (tx) => {
    const created = await tx.package.create({
      data: {
        tenantId,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        basePrice: input.basePrice,
        gameIncluded: input.gameIncluded,
        shoesIncluded: input.shoesIncluded,
        gameCostPer: input.gameIncluded ? null : input.gameCostPer ?? null,
        shoeCostPer: input.shoesIncluded ? null : input.shoeCostPer ?? null,
        partyTypes: input.partyTypes,
        active: input.active,
        sortOrder: input.sortOrder,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PACKAGE_CREATED',
        entityType: 'Package',
        entityId: created.id,
        details: {
          name: input.name,
          basePrice: input.basePrice,
          active: input.active,
          partyTypes: input.partyTypes,
        },
      },
    })
    return created
  })

  revalidatePath('/admin/packages')
  return { packageId: pkg.id, mocked: false }
}

export async function updatePackageAction(
  packageId: string,
  input: PackageInput,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  validatePackageInput(input)

  if (isDevWithoutDb()) {
    console.log(`[admin] mock package update by ${user.email}`, {
      packageId,
      input,
    })
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    await tx.package.update({
      where: { id: packageId },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        basePrice: input.basePrice,
        gameIncluded: input.gameIncluded,
        shoesIncluded: input.shoesIncluded,
        gameCostPer: input.gameIncluded ? null : input.gameCostPer ?? null,
        shoeCostPer: input.shoesIncluded ? null : input.shoeCostPer ?? null,
        partyTypes: input.partyTypes,
        active: input.active,
        sortOrder: input.sortOrder,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PACKAGE_UPDATED',
        entityType: 'Package',
        entityId: packageId,
        details: {
          name: input.name,
          basePrice: input.basePrice,
          active: input.active,
          partyTypes: input.partyTypes,
        },
      },
    })
  })

  revalidatePath('/admin/packages')
  revalidatePath(`/admin/packages/${packageId}`)
  return { mocked: false }
}

export async function archivePackageAction(
  packageId: string,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')

  if (isDevWithoutDb()) {
    console.log(`[admin] mock package archive by ${user.email}`, packageId)
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    await tx.package.update({
      where: { id: packageId },
      data: { active: false },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PACKAGE_ARCHIVED',
        entityType: 'Package',
        entityId: packageId,
      },
    })
  })

  revalidatePath('/admin/packages')
  return { mocked: false }
}

// ── Team (Users) ──────────────────────────────────────────

export async function listTeamForAdmin(
  tenantId: string,
): Promise<AdminUserRow[]> {
  await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockUsers()
  }
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      role: { in: ['STAFF', 'MANAGER', 'ADMIN'] },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })
  return users.map(toAdminUserRow)
}

export async function getTeamUserForAdmin(
  userId: string,
): Promise<AdminUserRow | null> {
  await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockUsers().find((u) => u.id === userId) ?? null
  }
  const u = await prisma.user.findUnique({ where: { id: userId } })
  if (!u) return null
  return toAdminUserRow(u)
}

export interface CreateUserInput {
  tenantId: string
  email: string
  name?: string
  phone?: string
  role: 'STAFF' | 'MANAGER' | 'ADMIN'
  initialPassword: string
}

function requireCanAssignRole(user: CurrentUser, role: string): void {
  // Only ADMIN can create or promote to ADMIN. MANAGER can create STAFF
  // or MANAGER. Both can promote STAFF<->MANAGER but not assign ADMIN.
  if (role === 'ADMIN' && user.role !== 'ADMIN') {
    throw new Error('Only an ADMIN can assign the ADMIN role.')
  }
}

export async function createTeamUserAction(
  input: CreateUserInput,
): Promise<{ userId: string; mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  requireCanAssignRole(user, input.role)

  if (!/.+@.+\..+/.test(input.email)) {
    throw new Error('createTeamUserAction: invalid email')
  }
  if (input.initialPassword.length < 8) {
    throw new Error('createTeamUserAction: password must be 8+ characters')
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock team user create by ${user.email}`, {
      email: input.email,
      role: input.role,
    })
    return { userId: `user_mock_${Date.now()}`, mocked: true }
  }

  const hashed = await hashPassword(input.initialPassword)

  const created = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        tenantId: input.tenantId,
        email: input.email.toLowerCase().trim(),
        name: input.name?.trim() || null,
        phone: input.phone?.trim() || null,
        role: input.role,
        passwordHash: hashed,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEAM_USER_CREATED',
        entityType: 'User',
        entityId: u.id,
        details: { email: u.email, role: u.role },
      },
    })
    return u
  })

  revalidatePath('/admin/team')
  return { userId: created.id, mocked: false }
}

export interface UpdateUserInput {
  userId: string
  name?: string | null
  phone?: string | null
  role: 'STAFF' | 'MANAGER' | 'ADMIN'
}

export async function updateTeamUserAction(
  input: UpdateUserInput,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  requireCanAssignRole(user, input.role)

  if (input.userId === user.id && input.role !== user.role) {
    throw new Error('updateTeamUserAction: cannot change your own role')
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock team user update by ${user.email}`, input)
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: {
        name: input.name?.trim() || null,
        phone: input.phone?.trim() || null,
        role: input.role,
      },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEAM_USER_UPDATED',
        entityType: 'User',
        entityId: input.userId,
        details: { role: input.role },
      },
    })
  })

  revalidatePath('/admin/team')
  revalidatePath(`/admin/team/${input.userId}`)
  return { mocked: false }
}

export interface ResetUserPasswordInput {
  userId: string
  newPassword: string
}

export async function resetUserPasswordAction(
  input: ResetUserPasswordInput,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  if (input.newPassword.length < 8) {
    throw new Error('resetUserPasswordAction: password must be 8+ characters')
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock password reset by ${user.email}`, input.userId)
    return { mocked: true }
  }

  const hashed = await hashPassword(input.newPassword)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { passwordHash: hashed },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEAM_USER_PASSWORD_RESET',
        entityType: 'User',
        entityId: input.userId,
      },
    })
  })

  revalidatePath(`/admin/team/${input.userId}`)
  return { mocked: false }
}

export async function deactivateTeamUserAction(
  userId: string,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')

  if (userId === user.id) {
    throw new Error('deactivateTeamUserAction: cannot deactivate yourself')
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock team user deactivate by ${user.email}`, userId)
    return { mocked: true }
  }

  // "Deactivate" = demote to CUSTOMER + null out passwordHash. The user can
  // no longer sign in via Credentials, and they vanish from the team list
  // (which filters role IN STAFF/MANAGER/ADMIN). We never hard-delete users
  // because Booking rows reference them via Booking.userId.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role: 'CUSTOMER', passwordHash: null },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEAM_USER_DEACTIVATED',
        entityType: 'User',
        entityId: userId,
      },
    })
  })

  revalidatePath('/admin/team')
  return { mocked: false }
}

// ── Audit log (read-only, ADMIN-only) ─────────────────────
//
// The `AUDIT_LOG_ACTIONS` constant lives in `src/lib/audit-actions.ts`
// because `'use server'` files can only export async functions — Next.js
// blocks non-function exports at module-eval time.

export interface AuditLogFilter {
  action?: string
  entityType?: string
  userId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

export interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  bookingId: string | null
  details: unknown
  createdAt: Date
}

export interface AuditLogPage {
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

function normalizeAuditPaging(filter: AuditLogFilter): {
  page: number
  pageSize: number
} {
  const page = filter.page ?? 1
  if (!Number.isInteger(page) || page < 1) {
    throw new Error('listAuditLogs: page must be an integer >= 1')
  }
  let pageSize = filter.pageSize ?? 50
  if (typeof pageSize !== 'number' || !Number.isFinite(pageSize)) {
    throw new Error('listAuditLogs: pageSize must be a finite number')
  }
  if (!Number.isInteger(pageSize)) {
    throw new Error('listAuditLogs: pageSize must be an integer')
  }
  if (pageSize < 1) {
    throw new Error('listAuditLogs: pageSize must be between 1 and 200')
  }
  if (pageSize > 200) {
    pageSize = 200
  }
  return { page, pageSize }
}

function buildAuditWhere(filter: AuditLogFilter): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {}
  if (filter.action !== undefined && filter.action !== '') {
    where.action = filter.action
  }
  if (filter.entityType !== undefined && filter.entityType !== '') {
    where.entityType = filter.entityType
  }
  if (filter.userId !== undefined && filter.userId !== '') {
    where.userId = filter.userId
  }
  if (filter.startDate !== undefined || filter.endDate !== undefined) {
    where.createdAt = {}
    if (filter.startDate !== undefined) {
      where.createdAt.gte = filter.startDate
    }
    if (filter.endDate !== undefined) {
      where.createdAt.lte = filter.endDate
    }
  }
  return where
}

function mockAuditLogPage(filter: AuditLogFilter): AuditLogPage {
  const { page, pageSize } = normalizeAuditPaging(filter)
  const baseTime = new Date('2026-03-10T15:30:00.000Z')
  const allEntries: AuditLogEntry[] = [
    {
      id: 'audit_mock_1',
      action: 'TENANT_UPDATED',
      entityType: 'Tenant',
      entityId: 'tenant_dev_mock',
      userId: 'user_mock_admin',
      userName: 'Site Admin',
      userEmail: 'admin@royalz.local',
      bookingId: null,
      details: { name: 'Royal Z Lanes', timezone: 'America/New_York' },
      createdAt: new Date(baseTime.getTime()),
    },
    {
      id: 'audit_mock_2',
      action: 'OPERATING_HOURS_UPDATED',
      entityType: 'Tenant',
      entityId: 'tenant_dev_mock',
      userId: 'user_mock_mgr',
      userName: 'Casey Manager',
      userEmail: 'manager@royalz.local',
      bookingId: null,
      details: { hoursCount: 7 },
      createdAt: new Date(baseTime.getTime() - 60_000),
    },
    {
      id: 'audit_mock_3',
      action: 'PACKAGE_CREATED',
      entityType: 'Package',
      entityId: 'pkg-classic',
      userId: 'user_mock_admin',
      userName: 'Site Admin',
      userEmail: 'admin@royalz.local',
      bookingId: null,
      details: { name: 'Classic Bowling', basePrice: 3600 },
      createdAt: new Date(baseTime.getTime() - 120_000),
    },
    {
      id: 'audit_mock_4',
      action: 'TEAM_USER_CREATED',
      entityType: 'User',
      entityId: 'user_mock_staff1',
      userId: 'user_mock_admin',
      userName: 'Site Admin',
      userEmail: 'admin@royalz.local',
      bookingId: null,
      details: { email: 'staff1@royalz.local', role: 'STAFF' },
      createdAt: new Date(baseTime.getTime() - 180_000),
    },
    {
      id: 'audit_mock_5',
      action: 'BOOKING_CUSTOMER_CANCELLED',
      entityType: 'Booking',
      entityId: 'bk_mock_cancel',
      userId: null,
      userName: null,
      userEmail: null,
      bookingId: 'bk_mock_cancel',
      details: { reason: 'Change of plans' },
      createdAt: new Date(baseTime.getTime() - 240_000),
    },
    {
      id: 'audit_mock_6',
      action: 'LANE_BLOCK_CREATED',
      entityType: 'BlockedSlot',
      entityId: 'block_mock_1',
      userId: 'user_mock_staff1',
      userName: 'Jordan Staff',
      userEmail: 'staff1@royalz.local',
      bookingId: null,
      details: { lanes: [1, 2], reason: 'League' },
      createdAt: new Date(baseTime.getTime() - 300_000),
    },
    {
      id: 'audit_mock_7',
      action: 'BOOKING_MANUAL_REFUND',
      entityType: 'Booking',
      entityId: 'bk_mock_refund',
      userId: 'user_mock_mgr',
      userName: 'Casey Manager',
      userEmail: 'manager@royalz.local',
      bookingId: 'bk_mock_refund',
      details: { amountCents: 4500 },
      createdAt: new Date(baseTime.getTime() - 360_000),
    },
  ]

  let rows = allEntries
  if (filter.action) {
    rows = rows.filter((e) => e.action === filter.action)
  }
  if (filter.entityType) {
    rows = rows.filter((e) => e.entityType === filter.entityType)
  }
  if (filter.userId) {
    rows = rows.filter((e) => e.userId === filter.userId)
  }
  if (filter.startDate) {
    rows = rows.filter((e) => e.createdAt >= filter.startDate!)
  }
  if (filter.endDate) {
    rows = rows.filter((e) => e.createdAt <= filter.endDate!)
  }

  const total = rows.length
  const skip = (page - 1) * pageSize
  const entries = rows.slice(skip, skip + pageSize)
  return {
    entries,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
}

export async function listAuditLogs(
  filter: AuditLogFilter,
): Promise<AuditLogPage> {
  await requireRole('ADMIN')

  if (isDevWithoutDb()) {
    return mockAuditLogPage(filter)
  }

  const { page, pageSize } = normalizeAuditPaging(filter)
  const where = buildAuditWhere(filter)
  const skip = (page - 1) * pageSize

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  const userIds = [
    ...new Set(
      rows.map((r) => r.userId).filter((id): id is string => id != null),
    ),
  ]

  const users =
    userIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })

  const userById = new Map(users.map((u) => [u.id, u]))

  const entries: AuditLogEntry[] = rows.map((r) => {
    const u = r.userId ? userById.get(r.userId) : undefined
    return {
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      userId: r.userId,
      userName: u?.name ?? null,
      userEmail: u?.email ?? null,
      bookingId: r.bookingId,
      details: r.details === null ? null : r.details,
      createdAt: r.createdAt,
    }
  })

  return {
    entries,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  }
}

// ── Helpers ───────────────────────────────────────────────

interface UserRecord {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: AdminUserRow['role']
  passwordHash: string | null
  createdAt: Date
}

function toAdminUserRow(u: UserRecord): AdminUserRow {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: u.role,
    hasPassword: u.passwordHash !== null,
    createdAt: u.createdAt,
  }
}

// ── Mocks (dev-without-db) ────────────────────────────────

function mockOperatingHours(): AdminOperatingHour[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `oh_mock_${i}`,
    dayOfWeek: i,
    openTime: i === 0 || i === 6 ? '12:00' : '14:00',
    closeTime: i === 5 || i === 6 ? '02:00' : '23:00',
    closed: false,
  }))
}

function mockPackages(): AdminPackageRow[] {
  return [
    {
      id: 'pkg-classic',
      name: 'Classic Bowling',
      description: 'Two games per bowler. Shoes included.',
      basePrice: 3600,
      gameIncluded: true,
      shoesIncluded: true,
      gameCostPer: null,
      shoeCostPer: null,
      partyTypes: ['OPEN'],
      active: true,
      sortOrder: 1,
    },
    {
      id: 'pkg-pay-per-game',
      name: 'Pay-Per-Game',
      description: 'Just lane time. Pay per game, shoes extra.',
      basePrice: 1200,
      gameIncluded: false,
      shoesIncluded: false,
      gameCostPer: 800,
      shoeCostPer: 500,
      partyTypes: ['OPEN'],
      active: true,
      sortOrder: 2,
    },
    {
      id: 'pkg-birthday',
      name: 'Birthday Party',
      description: 'Two hours of bowling, pizza, and soda for the group.',
      basePrice: 12000,
      gameIncluded: true,
      shoesIncluded: true,
      gameCostPer: null,
      shoeCostPer: null,
      partyTypes: ['BIRTHDAY'],
      active: true,
      sortOrder: 3,
    },
  ]
}

function mockUsers(): AdminUserRow[] {
  const now = new Date()
  return [
    {
      id: 'user_mock_admin',
      email: 'admin@royalz.local',
      name: 'Site Admin',
      phone: null,
      role: 'ADMIN',
      hasPassword: true,
      createdAt: now,
    },
    {
      id: 'user_mock_mgr',
      email: 'manager@royalz.local',
      name: 'Casey Manager',
      phone: '(555) 555-2222',
      role: 'MANAGER',
      hasPassword: true,
      createdAt: now,
    },
    {
      id: 'user_mock_staff1',
      email: 'staff1@royalz.local',
      name: 'Jordan Staff',
      phone: null,
      role: 'STAFF',
      hasPassword: true,
      createdAt: now,
    },
    {
      id: 'user_mock_staff2',
      email: 'staff2@royalz.local',
      name: null,
      phone: null,
      role: 'STAFF',
      hasPassword: false,
      createdAt: now,
    },
  ]
}
