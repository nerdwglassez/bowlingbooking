'use server'

// admin.ts — Server actions for the admin settings shell.
//
// Every mutation action enforces MANAGER or ADMIN via `requireRole(...)`.
// `listAuditLogs` and `getReportsSummary` are read-only and ADMIN-only.
// Role-gating is server-side ONLY; never trust a client-side role claim.
//
// Dev-without-DB: reads return deterministic mock data so the admin app is
// reviewable without Postgres. Writes log + return a synthesized result
// with `mocked: true`.

import { revalidatePath } from 'next/cache'

import type { Prisma } from '@/generated/prisma/client'

import {
  dispatchTeamInviteEmail,
  issueTeamInviteToken,
} from '@/lib/team-invite-shared'
import { hashPassword, requireRole, type CurrentUser } from '@/lib/auth'
import { isDevWithoutDb, shouldUseDevDbFallback, warnOnce } from '@/lib/env'
import { isUniqueConstraintOnField } from '@/lib/prisma-errors'
import { prisma } from '@/lib/prisma'
import { appBaseUrl } from '@/lib/secure-tokens'
import {
  assertAdminTenantAccess as assertAdminTenantBound,
  isPlatformAdmin,
} from '@/lib/tenant-access'
import {
  isIntegrationEnabled,
  mergeIntegrationsConfig,
  readIntegrationsConfig,
  removeIntegrationFromConfig,
  type IntegrationId,
} from '@/lib/integrations'
import {
  createConnectAccountLink,
  createConnectExpressAccount,
  getConnectAccountStatus,
} from '@/lib/stripe'
import { hasResendApiKey } from '@/lib/env'
import { getTenant } from '@/lib/tenant'
import { isValidThemeSlug } from '@/lib/themes'

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
  /** Hours before booking start a customer may still cancel. From Tenant.config. */
  cancellationWindowHours: number
  /** Percent of total refunded when cancelling within window (0-100). From Tenant.config. */
  cancellationRefundPercent: number
  /** Reply-to email for booking confirmations. From Tenant.config. */
  contactEmail: string
  /** Per-bowler shoe rental in cents. From Tenant.config. */
  shoeRentalPriceCents: number
  /** Lane reservation base per lane in cents. From Tenant.config. */
  laneReservationCentsPerLane: number
  /** Display-only pricing strategy label. From Tenant.config. */
  pricingStrategy: string
  minBookingDurationHours: number
  maxBookingDurationHours: number
  totalLanes: number
  bowlersPerLane: number
  rescheduleWindowHours: number
  checkInWindowMinutes: number
  minBookingNoticeMinutes: number
  maxAdvanceBookingDays: number
  lateGraceMinutes: number
  allowWalkInBookings: boolean
  requireAccountToModify: boolean
}

export interface AdminPricingPeriodRow {
  id: string
  name: string
  ratePerPersonPerHour: number
  daysOfWeek: number[]
  startTime: string | null
  endTime: string | null
  priority: number
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
  accessType: string
  codeString: string | null
  pricingType: string | null
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

const assertAdminTenantAccess = assertAdminTenantBound

// ── Venue / tenant ────────────────────────────────────────

/** Read-only tenant settings fields — all staff roles (hours view, etc.). */
export async function getTenantSettingsDetail(
  tenantId: string,
): Promise<AdminTenantDetail | null> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'getTenantSettingsDetail')
  return loadTenantDetail(tenantId)
}

export async function getTenantForAdmin(
  tenantId: string,
): Promise<AdminTenantDetail | null> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'getTenantForAdmin')
  return loadTenantDetail(tenantId)
}

async function loadTenantDetail(
  tenantId: string,
): Promise<AdminTenantDetail | null> {
  if (isDevWithoutDb()) {
    return {
      id: tenantId,
      name: 'Royal Z Lanes',
      slug: 'royalz',
      address: '8512 Two Notch Rd, Columbia, SC 29223',
      phone: '(803) 555-0100',
      timezone: 'America/New_York',
      themeSlug: 'default',
      holdTimeoutMins: 10,
      maxOnlineBowlers: 18,
      cancellationWindowHours: 24,
      cancellationRefundPercent: 100,
      contactEmail: 'info@royalzlanes.com',
      shoeRentalPriceCents: 400,
      laneReservationCentsPerLane: 850,
      pricingStrategy: 'per_person_hour',
      minBookingDurationHours: 1,
      maxBookingDurationHours: 4,
      totalLanes: 12,
      bowlersPerLane: 6,
      rescheduleWindowHours: 24,
      checkInWindowMinutes: 60,
      minBookingNoticeMinutes: 0,
      maxAdvanceBookingDays: 90,
      lateGraceMinutes: 5,
      allowWalkInBookings: true,
      requireAccountToModify: false,
    }
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) return null
  const extra = readTenantConfigFields(tenant.config)
  const totalLanes = await prisma.lane.count({ where: { tenantId: tenant.id } })
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
    cancellationWindowHours: tenant.cancellationWindowHours,
    cancellationRefundPercent: tenant.cancellationRefundPercent,
    contactEmail: extra.contactEmail,
    shoeRentalPriceCents: extra.shoeRentalPriceCents,
    laneReservationCentsPerLane: extra.laneReservationCentsPerLane,
    pricingStrategy: extra.pricingStrategy,
    minBookingDurationHours: extra.minBookingDurationHours,
    maxBookingDurationHours: extra.maxBookingDurationHours,
    totalLanes: Math.max(totalLanes, 1),
    bowlersPerLane: tenant.bowlersPerLane,
    rescheduleWindowHours: tenant.rescheduleWindowHours,
    checkInWindowMinutes: tenant.checkInWindowMinutes,
    minBookingNoticeMinutes: extra.minBookingNoticeMinutes,
    maxAdvanceBookingDays: extra.maxAdvanceBookingDays,
    lateGraceMinutes: extra.lateGraceMinutes,
    allowWalkInBookings: extra.allowWalkInBookings,
    requireAccountToModify: extra.requireAccountToModify,
  }
}

// Typed columns on Tenant hold cancellation policy; config JSON holds
// contactEmail, shoe pricing, and duration settings only.
function readConfigObject(config: unknown): Record<string, unknown> {
  return config && typeof config === 'object' && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {}
}

function readTenantConfigFields(config: unknown): {
  contactEmail: string
  shoeRentalPriceCents: number
  laneReservationCentsPerLane: number
  pricingStrategy: string
  minBookingDurationHours: number
  maxBookingDurationHours: number
  minBookingNoticeMinutes: number
  maxAdvanceBookingDays: number
  lateGraceMinutes: number
  allowWalkInBookings: boolean
  requireAccountToModify: boolean
} {
  const obj = readConfigObject(config)
  return {
    contactEmail:
      typeof obj.contactEmail === 'string' ? obj.contactEmail : '',
    shoeRentalPriceCents:
      typeof obj.shoeRentalPriceCents === 'number' &&
      obj.shoeRentalPriceCents >= 0
        ? obj.shoeRentalPriceCents
        : 400,
    laneReservationCentsPerLane:
      typeof obj.laneReservationCentsPerLane === 'number' &&
      obj.laneReservationCentsPerLane >= 0
        ? obj.laneReservationCentsPerLane
        : 1200,
    pricingStrategy:
      typeof obj.pricingStrategy === 'string'
        ? obj.pricingStrategy
        : 'packages_only',
    minBookingDurationHours:
      typeof obj.minBookingDurationHours === 'number' &&
      obj.minBookingDurationHours >= 0.5
        ? obj.minBookingDurationHours
        : 1,
    maxBookingDurationHours:
      typeof obj.maxBookingDurationHours === 'number' &&
      obj.maxBookingDurationHours >= 1
        ? obj.maxBookingDurationHours
        : 4,
    minBookingNoticeMinutes:
      typeof obj.minBookingNoticeMinutes === 'number' &&
      obj.minBookingNoticeMinutes >= 0
        ? obj.minBookingNoticeMinutes
        : 0,
    maxAdvanceBookingDays:
      typeof obj.maxAdvanceBookingDays === 'number' &&
      obj.maxAdvanceBookingDays >= 1
        ? obj.maxAdvanceBookingDays
        : 90,
    lateGraceMinutes:
      typeof obj.lateGraceMinutes === 'number' && obj.lateGraceMinutes >= 0
        ? obj.lateGraceMinutes
        : 5,
    allowWalkInBookings:
      typeof obj.allowWalkInBookings === 'boolean'
        ? obj.allowWalkInBookings
        : true,
    requireAccountToModify:
      typeof obj.requireAccountToModify === 'boolean'
        ? obj.requireAccountToModify
        : false,
  }
}

export interface SettingsHubMeta {
  packageCount: number
  teamCount: number
  integrationsSummary: string
}

/** Summaries for settings hub item sub-labels. */
export async function getSettingsHubMeta(
  tenantId: string,
): Promise<SettingsHubMeta> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'getSettingsHubMeta')

  if (isDevWithoutDb()) {
    return {
      packageCount: 5,
      teamCount: 5,
      integrationsSummary: 'Stripe connected · Make error',
    }
  }

  const [packageCount, teamCount] = await Promise.all([
    prisma.package.count({ where: { tenantId, active: true } }),
    prisma.user.count({
      where: { tenantId, role: { in: ['STAFF', 'MANAGER', 'ADMIN'] } },
    }),
  ])

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  const integrationsSummary = stripeConfigured
    ? 'Stripe connected · Make optional'
    : 'Stripe required · not connected'

  return { packageCount, teamCount, integrationsSummary }
}

export interface UpdateTenantInput {
  tenantId: string
  name: string
  address: string
  phone: string
  timezone: string
  themeSlug: string
  holdTimeoutMins: number
  maxOnlineBowlers: number
  cancellationWindowHours: number
  cancellationRefundPercent: number
  bowlersPerLane?: number
  rescheduleWindowHours?: number
  checkInWindowMinutes?: number
  minBookingNoticeMinutes?: number
  maxAdvanceBookingDays?: number
  lateGraceMinutes?: number
  allowWalkInBookings?: boolean
  requireAccountToModify?: boolean
  contactEmail?: string
  shoeRentalPriceCents?: number
  laneReservationCentsPerLane?: number
  pricingStrategy?: string
  minBookingDurationHours?: number
  maxBookingDurationHours?: number
}

export interface UpdateTenantResult {
  mocked: boolean
}

export async function updateTenantAction(
  input: UpdateTenantInput,
): Promise<UpdateTenantResult> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, input.tenantId, 'updateTenantAction')

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
  if (
    !Number.isInteger(input.cancellationWindowHours) ||
    input.cancellationWindowHours < 0 ||
    input.cancellationWindowHours > 240
  ) {
    throw new Error(
      'updateTenantAction: cancellationWindowHours must be 0..240',
    )
  }
  if (
    !Number.isInteger(input.cancellationRefundPercent) ||
    input.cancellationRefundPercent < 0 ||
    input.cancellationRefundPercent > 100
  ) {
    throw new Error(
      'updateTenantAction: cancellationRefundPercent must be 0..100',
    )
  }
  if (!isValidThemeSlug(input.themeSlug)) {
    throw new Error(
      `updateTenantAction: themeSlug must be a known preset (got "${input.themeSlug}")`,
    )
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock tenant update by ${user.email}`, input)
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: { config: true },
    })
    const existingConfig =
      existing?.config &&
      typeof existing.config === 'object' &&
      !Array.isArray(existing.config)
        ? (existing.config as Record<string, unknown>)
        : {}
    const nextConfig: Record<string, unknown> = { ...existingConfig }
    if (input.contactEmail !== undefined) {
      nextConfig.contactEmail = input.contactEmail.trim()
    }
    if (input.shoeRentalPriceCents !== undefined) {
      nextConfig.shoeRentalPriceCents = input.shoeRentalPriceCents
    }
    if (input.laneReservationCentsPerLane !== undefined) {
      nextConfig.laneReservationCentsPerLane = input.laneReservationCentsPerLane
    }
    if (input.pricingStrategy !== undefined) {
      nextConfig.pricingStrategy = input.pricingStrategy
    }
    if (input.minBookingDurationHours !== undefined) {
      nextConfig.minBookingDurationHours = input.minBookingDurationHours
    }
    if (input.maxBookingDurationHours !== undefined) {
      nextConfig.maxBookingDurationHours = input.maxBookingDurationHours
    }
    if (input.minBookingNoticeMinutes !== undefined) {
      nextConfig.minBookingNoticeMinutes = input.minBookingNoticeMinutes
    }
    if (input.maxAdvanceBookingDays !== undefined) {
      nextConfig.maxAdvanceBookingDays = input.maxAdvanceBookingDays
    }
    if (input.lateGraceMinutes !== undefined) {
      nextConfig.lateGraceMinutes = input.lateGraceMinutes
    }
    if (input.allowWalkInBookings !== undefined) {
      nextConfig.allowWalkInBookings = input.allowWalkInBookings
    }
    if (input.requireAccountToModify !== undefined) {
      nextConfig.requireAccountToModify = input.requireAccountToModify
    }

    await tx.tenant.update({
      where: { id: input.tenantId },
      data: {
        name: input.name.trim(),
        address: input.address.trim(),
        phone: input.phone.trim(),
        timezone: input.timezone,
        themeSlug: input.themeSlug,
        holdTimeoutMins: input.holdTimeoutMins,
        maxOnlineBowlers: input.maxOnlineBowlers,
        cancellationWindowHours: input.cancellationWindowHours,
        cancellationRefundPercent: input.cancellationRefundPercent,
        bowlersPerLane: input.bowlersPerLane ?? undefined,
        rescheduleWindowHours: input.rescheduleWindowHours ?? undefined,
        checkInWindowMinutes: input.checkInWindowMinutes ?? undefined,
        config: nextConfig as Prisma.InputJsonValue,
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
          themeSlug: input.themeSlug,
          holdTimeoutMins: input.holdTimeoutMins,
          maxOnlineBowlers: input.maxOnlineBowlers,
          cancellationWindowHours: input.cancellationWindowHours,
          cancellationRefundPercent: input.cancellationRefundPercent,
        },
      },
    })
  })

  revalidatePath('/admin')
  revalidatePath('/admin/venue')
  revalidatePath('/staff/settings')
  revalidatePath('/staff/settings/venue')
  revalidatePath('/staff/settings/policies')
  revalidatePath('/staff/settings/pricing')
  return { mocked: false }
}

// ── Operating hours ───────────────────────────────────────

export async function getOperatingHours(
  tenantId: string,
): Promise<AdminOperatingHour[]> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'getOperatingHours')
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
  assertAdminTenantAccess(user, input.tenantId, 'updateOperatingHoursAction')

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
  revalidatePath('/staff/settings/hours')
  return { mocked: false }
}

export async function syncTenantLanesAction(
  tenantId: string,
  targetCount: number,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'syncTenantLanesAction')
  if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 48) {
    throw new Error('syncTenantLanesAction: targetCount must be 1..48')
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock lane sync by ${user.email}`, { tenantId, targetCount })
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.lane.findMany({
      where: { tenantId },
      orderBy: { number: 'asc' },
    })
    const current = existing.length

    if (targetCount > current) {
      const maxNum = existing.reduce((m, l) => Math.max(m, l.number), 0)
      const toCreate = Array.from({ length: targetCount - current }, (_, i) => ({
        tenantId,
        number: maxNum + i + 1,
        active: true,
      }))
      await tx.lane.createMany({ data: toCreate })
    } else if (targetCount < current) {
      const removable = existing
        .slice()
        .sort((a, b) => b.number - a.number)
        .slice(0, current - targetCount)
      await tx.lane.deleteMany({
        where: { id: { in: removable.map((l) => l.id) } },
      })
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: tenantId,
        details: { laneCount: targetCount },
      },
    })
  })

  revalidatePath('/staff/settings/hours')
  revalidatePath('/staff')
  revalidatePath('/staff/schedule')
  return { mocked: false }
}

// ── Pricing periods ───────────────────────────────────────

export async function listPricingPeriodsForAdmin(
  tenantId: string,
): Promise<AdminPricingPeriodRow[]> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'listPricingPeriodsForAdmin')
  if (isDevWithoutDb()) {
    return [
      {
        id: 'mock-pp-1',
        name: 'Default',
        ratePerPersonPerHour: 850,
        daysOfWeek: [],
        startTime: null,
        endTime: null,
        priority: 0,
      },
      {
        id: 'mock-pp-2',
        name: 'Peak evenings',
        ratePerPersonPerHour: 1200,
        daysOfWeek: [5, 6],
        startTime: '17:00',
        endTime: '23:00',
        priority: 1,
      },
    ]
  }
  const rows = await prisma.pricingPeriod.findMany({
    where: { tenantId },
    orderBy: [{ priority: 'desc' }, { name: 'asc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    ratePerPersonPerHour: r.ratePerPersonPerHour,
    daysOfWeek: r.daysOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    priority: r.priority,
  }))
}

export interface UpsertPricingPeriodInput {
  tenantId: string
  id?: string
  name: string
  ratePerPersonPerHour: number
  daysOfWeek: number[]
  startTime: string | null
  endTime: string | null
  priority: number
}

export async function upsertPricingPeriodAction(
  input: UpsertPricingPeriodInput,
): Promise<{ id: string; mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, input.tenantId, 'upsertPricingPeriodAction')
  if (!input.name.trim()) throw new Error('Period name is required')
  if (input.ratePerPersonPerHour < 0) {
    throw new Error('Rate must be non-negative')
  }

  if (isDevWithoutDb()) {
    return { id: input.id ?? 'mock-period', mocked: true }
  }

  const id = await prisma.$transaction(async (tx) => {
    const priorityConflict = await tx.pricingPeriod.findFirst({
      where: {
        tenantId: input.tenantId,
        priority: input.priority,
        ...(input.id ? { NOT: { id: input.id } } : {}),
      },
      select: { id: true, name: true },
    })
    if (priorityConflict) {
      throw new Error(
        `Priority ${input.priority} is already used by "${priorityConflict.name}". Choose a different priority.`,
      )
    }

    let periodId: string
    if (input.id) {
      const existing = await tx.pricingPeriod.findUnique({
        where: { id: input.id },
        select: { tenantId: true },
      })
      if (!existing || existing.tenantId !== input.tenantId) {
        throw new Error('Pricing period not found.')
      }
      await tx.pricingPeriod.update({
        where: { id: input.id },
        data: {
          name: input.name.trim(),
          ratePerPersonPerHour: input.ratePerPersonPerHour,
          daysOfWeek: input.daysOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          priority: input.priority,
        },
      })
      periodId = input.id
    } else {
      const created = await tx.pricingPeriod.create({
        data: {
          tenantId: input.tenantId,
          name: input.name.trim(),
          ratePerPersonPerHour: input.ratePerPersonPerHour,
          daysOfWeek: input.daysOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          priority: input.priority,
          specificDates: [],
        },
      })
      periodId = created.id
    }
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: input.tenantId,
        details: { pricingPeriodId: periodId, name: input.name },
      },
    })
    return periodId
  })

  revalidatePath('/staff/settings/pricing')
  return { id, mocked: false }
}

export async function deletePricingPeriodAction(
  tenantId: string,
  periodId: string,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'deletePricingPeriodAction')

  if (isDevWithoutDb()) {
    return { mocked: true }
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.pricingPeriod.findUnique({
      where: { id: periodId },
      select: { tenantId: true },
    })
    if (!existing || existing.tenantId !== tenantId) {
      throw new Error('Pricing period not found.')
    }
    await tx.pricingPeriod.delete({ where: { id: periodId } })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: tenantId,
        details: { deletedPricingPeriodId: periodId },
      },
    })
  })

  revalidatePath('/staff/settings/pricing')
  return { mocked: false }
}

// ── Profile ───────────────────────────────────────────────

export async function getStaffProfile(): Promise<{
  name: string
  email: string
  role: CurrentUser['role']
}> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return {
      name: user.name ?? '',
      email: user.email ?? '',
      role: user.role,
    }
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, role: true },
  })

  return {
    name: row?.name ?? user.name ?? '',
    email: row?.email ?? user.email ?? '',
    role: row?.role ?? user.role,
  }
}

export async function updateProfileAction(input: {
  name: string
  email: string
  currentPassword?: string
  newPassword?: string
}): Promise<{ mocked: boolean }> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const { verifyCredentials, hashPassword } = await import('@/lib/auth')

  const normalizedEmail = input.email.trim().toLowerCase()
  const sessionEmail = (user.email ?? '').trim().toLowerCase()
  const emailChanged = normalizedEmail !== sessionEmail
  const changingPassword = Boolean(input.newPassword?.trim())

  if (emailChanged || changingPassword) {
    if (!input.currentPassword) {
      throw new Error(
        'Current password is required to change your email or password.',
      )
    }
    const valid = await verifyCredentials(user.email ?? '', input.currentPassword)
    if (!valid) {
      throw new Error('Current password is incorrect')
    }
  }

  if (input.newPassword && input.newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters')
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock profile update by ${user.email}`)
    return { mocked: true }
  }

  const data: Prisma.UserUpdateInput = {
    name: input.name.trim() || null,
    email: normalizedEmail,
  }
  if (input.newPassword?.trim()) {
    data.passwordHash = await hashPassword(input.newPassword.trim())
  }

  await prisma.user.update({
    where: { id: user.id },
    data,
  })

  revalidatePath('/staff/settings/profile')
  return { mocked: false }
}

// ── Packages ──────────────────────────────────────────────

/** All packages for settings UI — STAFF read-only, MANAGER+ edit. */
export async function listPackagesForSettings(
  tenantId: string,
): Promise<AdminPackageRow[]> {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'listPackagesForSettings')
  return loadPackagesForTenant(tenantId)
}

export async function listPackagesForAdmin(
  tenantId: string,
): Promise<AdminPackageRow[]> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'listPackagesForAdmin')
  return loadPackagesForTenant(tenantId)
}

async function loadPackagesForTenant(
  tenantId: string,
): Promise<AdminPackageRow[]> {
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
    accessType: p.accessType,
    codeString: p.codeString,
    pricingType: p.pricingType,
  }))
}

export async function getPackageForAdmin(
  packageId: string,
): Promise<AdminPackageRow | null> {
  const user = await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockPackages().find((p) => p.id === packageId) ?? null
  }
  const pkg = await prisma.package.findUnique({ where: { id: packageId } })
  if (!pkg) return null
  assertAdminTenantAccess(user, pkg.tenantId, 'getPackageForAdmin')
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
    accessType: pkg.accessType,
    codeString: pkg.codeString,
    pricingType: pkg.pricingType,
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
  accessType?: 'PUBLIC' | 'CODE_REQUIRED'
  codeString?: string | null
  pricingType?: string | null
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
  const accessType = input.accessType ?? 'PUBLIC'
  if (accessType === 'CODE_REQUIRED' && !input.codeString?.trim()) {
    throw new Error('package: promo code is required for code-gated packages')
  }
}

export async function createPackageAction(
  tenantId: string,
  input: PackageInput,
): Promise<{ packageId: string; mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'createPackageAction')
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
        accessType: input.accessType ?? 'PUBLIC',
        codeString:
          input.accessType === 'CODE_REQUIRED'
            ? input.codeString?.trim().toUpperCase() ?? null
            : null,
        pricingType: input.pricingType ?? null,
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
  revalidatePath('/staff/settings/packages')
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

  const existing = await prisma.package.findUnique({
    where: { id: packageId },
    select: { tenantId: true },
  })
  assertAdminTenantAccess(user, existing?.tenantId, 'updatePackageAction')

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
        accessType: input.accessType ?? 'PUBLIC',
        codeString:
          input.accessType === 'CODE_REQUIRED'
            ? input.codeString?.trim().toUpperCase() ?? null
            : null,
        pricingType: input.pricingType ?? null,
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
  revalidatePath('/staff/settings/packages')
  revalidatePath(`/admin/packages/${packageId}`)
  revalidatePath(`/staff/settings/packages/${packageId}`)
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

  const existing = await prisma.package.findUnique({
    where: { id: packageId },
    select: { tenantId: true },
  })
  assertAdminTenantAccess(user, existing?.tenantId, 'archivePackageAction')

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
  revalidatePath('/staff/settings/packages')
  return { mocked: false }
}

// ── Promo codes ───────────────────────────────────────────

export interface AdminPromoRow {
  id: string
  code: string
  description: string | null
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  maxUses: number | null
  usesCount: number
  expiresAt: Date | null
  active: boolean
  createdAt: Date
}

export type AdminPromoDetail = AdminPromoRow

export interface PromoInput {
  tenantId: string
  code: string
  description: string | null
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  maxUses: number | null
  expiresAt: Date | null
}

const PROMO_CODE_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/

function normalizePromoCode(raw: string): string {
  return raw.trim().toLowerCase()
}

function validatePromoInput(input: PromoInput): void {
  if (!input.tenantId?.trim()) {
    throw new Error('promo: tenant is required')
  }
  const code = normalizePromoCode(input.code)
  if (!code) {
    throw new Error('promo: code is required')
  }
  if (!PROMO_CODE_PATTERN.test(code)) {
    throw new Error(
      'promo: code must be 3–32 characters and only letters, digits, hyphen, or underscore',
    )
  }
  if (input.discountType === 'PERCENT') {
    if (
      !Number.isInteger(input.discountValue) ||
      input.discountValue < 1 ||
      input.discountValue > 100
    ) {
      throw new Error('promo: percent discount must be a whole number from 1 to 100')
    }
  } else {
    if (!Number.isInteger(input.discountValue) || input.discountValue < 1) {
      throw new Error('promo: fixed discount must be at least 1 cent')
    }
  }
  if (input.maxUses != null) {
    if (!Number.isInteger(input.maxUses) || input.maxUses < 1) {
      throw new Error('promo: max uses must be at least 1 when set')
    }
  }
  if (input.expiresAt != null) {
    const t = input.expiresAt.getTime()
    if (Number.isNaN(t) || input.expiresAt <= new Date()) {
      throw new Error('promo: expiry must be a future date and time')
    }
  }
}

function mockPromos(_tenantId: string): AdminPromoRow[] {
  const now = new Date()
  return [
    {
      id: 'promo_mock_1',
      code: 'welcome10',
      description: 'Welcome 10%',
      discountType: 'PERCENT',
      discountValue: 10,
      maxUses: 100,
      usesCount: 2,
      expiresAt: null,
      active: true,
      createdAt: new Date(now.getTime() - 86_400_000),
    },
    {
      id: 'promo_mock_2',
      code: 'off500',
      description: '$5 off',
      discountType: 'FIXED',
      discountValue: 500,
      maxUses: null,
      usesCount: 0,
      expiresAt: null,
      active: false,
      createdAt: new Date(now.getTime() - 172_800_000),
    },
  ]
}

export async function listPromosForAdmin(
  tenantId: string,
): Promise<AdminPromoRow[]> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'listPromosForAdmin')
  if (isDevWithoutDb()) {
    return mockPromos(tenantId)
  }
  const rows = await prisma.promoCode.findMany({
    where: { tenantId },
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    description: r.description,
    discountType: r.discountType,
    discountValue: r.discountValue,
    maxUses: r.maxUses,
    usesCount: r.usesCount,
    expiresAt: r.expiresAt,
    active: r.active,
    createdAt: r.createdAt,
  }))
}

export async function getPromoForAdmin(
  promoId: string,
): Promise<AdminPromoDetail | null> {
  const user = await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockPromos('t').find((p) => p.id === promoId) ?? null
  }
  const r = await prisma.promoCode.findUnique({ where: { id: promoId } })
  if (!r) return null
  assertAdminTenantAccess(user, r.tenantId, 'getPromoForAdmin')
  return {
    id: r.id,
    code: r.code,
    description: r.description,
    discountType: r.discountType,
    discountValue: r.discountValue,
    maxUses: r.maxUses,
    usesCount: r.usesCount,
    expiresAt: r.expiresAt,
    active: r.active,
    createdAt: r.createdAt,
  }
}

export async function createPromoAction(
  input: PromoInput,
): Promise<{ id: string; mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, input.tenantId, 'createPromoAction')
  validatePromoInput(input)
  const code = normalizePromoCode(input.code)

  if (isDevWithoutDb()) {
    console.log(`[admin] mock promo create by ${user.email}`, { ...input, code })
    return { id: `promo_mock_${Date.now()}`, mocked: true }
  }

  const existingActive = await prisma.promoCode.findFirst({
    where: { tenantId: input.tenantId, code, active: true },
  })
  if (existingActive) {
    throw new Error('A promo with this code already exists for this venue.')
  }

  const anySameCode = await prisma.promoCode.findFirst({
    where: { tenantId: input.tenantId, code },
  })
  if (anySameCode && !anySameCode.active) {
    throw new Error(
      'This code already exists on an inactive promo. Reactivate that record or pick a different code.',
    )
  }
  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.promoCode.create({
        data: {
          tenantId: input.tenantId,
          code,
          description: input.description?.trim() || null,
          discountType: input.discountType,
          discountValue: input.discountValue,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt,
          active: true,
        },
      })
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PROMO_CREATED',
          entityType: 'PromoCode',
          entityId: row.id,
          details: {
            code,
            discountType: input.discountType,
            discountValue: input.discountValue,
            maxUses: input.maxUses,
          },
        },
      })
      return row
    })
    revalidatePath('/admin/promos')
    return { id: created.id, mocked: false }
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      throw new Error('A promo with this code already exists for this venue.')
    }
    throw err
  }
}

export async function updatePromoAction(
  input: PromoInput & { id: string },
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, input.tenantId, 'updatePromoAction')
  validatePromoInput(input)
  const code = normalizePromoCode(input.code)

  if (isDevWithoutDb()) {
    console.log(`[admin] mock promo update by ${user.email}`, { ...input, code })
    return { mocked: true }
  }

  const existing = await prisma.promoCode.findUnique({ where: { id: input.id } })
  if (!existing || existing.tenantId !== input.tenantId) {
    throw new Error('Promo not found.')
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.promoCode.update({
        where: { id: input.id },
        data: {
          code,
          description: input.description?.trim() || null,
          discountType: input.discountType,
          discountValue: input.discountValue,
          maxUses: input.maxUses,
          expiresAt: input.expiresAt,
        },
      })
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PROMO_UPDATED',
          entityType: 'PromoCode',
          entityId: input.id,
          details: {
            code,
            discountType: input.discountType,
            discountValue: input.discountValue,
            maxUses: input.maxUses,
          },
        },
      })
    })
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      throw new Error('A promo with this code already exists for this venue.')
    }
    throw err
  }

  revalidatePath('/admin/promos')
  revalidatePath(`/admin/promos/${input.id}`)
  return { mocked: false }
}

export async function deactivatePromoAction(
  promoId: string,
): Promise<{ mocked: boolean }> {
  const user = await requireRole('MANAGER', 'ADMIN')

  if (isDevWithoutDb()) {
    console.log(`[admin] mock promo deactivate by ${user.email}`, promoId)
    return { mocked: true }
  }

  const existing = await prisma.promoCode.findUnique({
    where: { id: promoId },
    select: { tenantId: true },
  })
  assertAdminTenantAccess(user, existing?.tenantId, 'deactivatePromoAction')

  await prisma.$transaction(async (tx) => {
    await tx.promoCode.update({
      where: { id: promoId },
      data: { active: false },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'PROMO_DEACTIVATED',
        entityType: 'PromoCode',
        entityId: promoId,
      },
    })
  })

  revalidatePath('/admin/promos')
  revalidatePath(`/admin/promos/${promoId}`)
  return { mocked: false }
}

// ── Team (Users) ──────────────────────────────────────────

export async function listTeamForAdmin(
  tenantId: string,
): Promise<AdminUserRow[]> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertAdminTenantAccess(user, tenantId, 'listTeamForAdmin')
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
  const user = await requireRole('MANAGER', 'ADMIN')
  if (isDevWithoutDb()) {
    return mockUsers().find((u) => u.id === userId) ?? null
  }
  const u = await prisma.user.findUnique({ where: { id: userId } })
  if (!u) return null
  assertAdminTenantAccess(user, u.tenantId, 'getTeamUserForAdmin')
  return toAdminUserRow(u)
}

export interface CreateUserInput {
  tenantId: string
  email: string
  name?: string
  phone?: string
  role: 'STAFF' | 'MANAGER' | 'ADMIN'
  personalMessage?: string
}

function requireCanAssignRole(user: CurrentUser, role: string): void {
  // Only ADMIN can create or promote to ADMIN. MANAGER can create STAFF
  // or MANAGER. Both can promote STAFF<->MANAGER but not assign ADMIN.
  if (role === 'ADMIN' && user.role !== 'ADMIN') {
    throw new Error('Only an ADMIN can assign the ADMIN role.')
  }
}

interface TeamMutationTarget {
  id: string
  tenantId: string
  role: 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN'
}

async function loadTeamMutationTarget(
  userId: string,
): Promise<TeamMutationTarget> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, tenantId: true, role: true },
  })
  if (!target?.tenantId) {
    throw new Error('Team user not found.')
  }
  return {
    id: target.id,
    tenantId: target.tenantId,
    role: target.role,
  }
}

function assertCanMutateTeamUser(
  actor: CurrentUser,
  target: TeamMutationTarget,
): void {
  if (!actor.tenantId) {
    throw new Error('Cannot mutate team users without a tenant context.')
  }
  if (target.tenantId !== actor.tenantId) {
    throw new Error('Cannot mutate users outside your tenant.')
  }
  if (target.role === 'ADMIN' && actor.role !== 'ADMIN') {
    throw new Error('Only an ADMIN can modify an ADMIN user.')
  }
}

async function requireTeamMutationTarget(
  actor: CurrentUser,
  userId: string,
): Promise<TeamMutationTarget> {
  const target = await loadTeamMutationTarget(userId)
  assertCanMutateTeamUser(actor, target)
  return target
}

export async function createTeamUserAction(
  input: CreateUserInput,
): Promise<{
  userId: string
  mocked: boolean
  emailDelivered: boolean
  inviteUrl?: string
  emailError?: string
}> {
  const user = await requireRole('MANAGER', 'ADMIN')
  requireCanAssignRole(user, input.role)

  if (user.tenantId && input.tenantId !== user.tenantId) {
    throw new Error(
      'createTeamUserAction: cannot create users outside your tenant.',
    )
  }

  if (!/.+@.+\..+/.test(input.email)) {
    throw new Error('createTeamUserAction: invalid email')
  }

  if (isDevWithoutDb()) {
    const mockToken = 'mock_invite_token'
    const inviteUrl = `${appBaseUrl()}/accept-invite?token=${encodeURIComponent(mockToken)}`
    console.log(
      `[admin] mock team user create by ${user.email}`,
      { email: input.email, role: input.role, inviteUrl },
    )
    return {
      userId: `user_mock_${Date.now()}`,
      mocked: true,
      emailDelivered: false,
      inviteUrl,
    }
  }

  let created: { id: string; email: string; role: typeof input.role }
  let rawToken: string

  try {
    const result = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          tenantId: input.tenantId,
          email: input.email.toLowerCase().trim(),
          name: input.name?.trim() || null,
          phone: input.phone?.trim() || null,
          role: input.role,
          passwordHash: null,
        },
      })
      const token = await issueTeamInviteToken(tx, {
        userId: u.id,
        invitedByUserId: user.id,
        personalMessage: input.personalMessage,
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
      return { u, token }
    })
    created = {
      id: result.u.id,
      email: result.u.email,
      role: input.role,
    }
    rawToken = result.token
  } catch (err) {
    if (isUniqueConstraintOnField(err, ['email'])) {
      throw new Error(
        'This email is already in use. Team members cannot share an email with a customer account.',
      )
    }
    throw err
  }

  const invite = await dispatchTeamInviteEmail({
    to: created.email,
    role: created.role,
    rawToken,
    inviterName: user.name,
    personalMessage: input.personalMessage,
  })

  revalidatePath('/admin/team')
  revalidatePath('/staff/settings/team')
  return {
    userId: created.id,
    mocked: false,
    emailDelivered: invite.emailDelivered,
    inviteUrl: invite.emailDelivered ? undefined : invite.inviteUrl,
    emailError: invite.emailDelivered ? undefined : invite.emailError,
  }
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

  if (input.userId === user.id && input.role !== user.role) {
    throw new Error('updateTeamUserAction: cannot change your own role')
  }

  if (!isDevWithoutDb()) {
    await requireTeamMutationTarget(user, input.userId)
  }

  requireCanAssignRole(user, input.role)

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
  revalidatePath('/staff/settings/team')
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

  if (input.userId === user.id) {
    throw new Error('resetUserPasswordAction: cannot reset your own password')
  }

  if (input.newPassword.length < 8) {
    throw new Error('resetUserPasswordAction: password must be 8+ characters')
  }

  if (!isDevWithoutDb()) {
    await requireTeamMutationTarget(user, input.userId)
  }

  if (isDevWithoutDb()) {
    console.log(`[admin] mock password reset by ${user.email}`, input.userId)
    return { mocked: true }
  }

  const hashed = await hashPassword(input.newPassword)

  await prisma.$transaction(async (tx) => {
    await tx.teamInviteToken.deleteMany({ where: { userId: input.userId } })
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

  revalidatePath('/admin/team')
  revalidatePath('/staff/settings/team')
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

  if (!isDevWithoutDb()) {
    await requireTeamMutationTarget(user, userId)
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
    await tx.teamInviteToken.deleteMany({ where: { userId } })
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
  revalidatePath('/staff/settings/team')
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

function buildAuditWhere(
  filter: AuditLogFilter,
  tenantId?: string | null,
): Prisma.AuditLogWhereInput {
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
  if (tenantId) {
    // Prefer the denormalized tenantId column; fall back to relation
    // probes for any pre-migration rows that were not backfilled.
    where.AND = [
      {
        OR: [
          { tenantId },
          {
            tenantId: null,
            OR: [
              { booking: { is: { tenantId } } },
              { user: { is: { tenantId } } },
              { entityType: 'Tenant', entityId: tenantId },
            ],
          },
        ],
      },
    ]
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
  const user = await requireRole('ADMIN')

  if (isDevWithoutDb()) {
    return mockAuditLogPage(filter)
  }

  const { page, pageSize } = normalizeAuditPaging(filter)
  // Platform ADMIN (null tenantId) sees all tenants; tenant-bound ADMIN is scoped.
  const scopeTenantId = isPlatformAdmin(user) ? null : user.tenantId
  const where = buildAuditWhere(filter, scopeTenantId)
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

// ── Reports (read-only, ADMIN-only) ───────────────────────
//
// v1 uses UTC calendar days for the query window and for daily chart buckets
// (booking.startTime UTC date). True tenant-local midnight boundaries are
// deferred — see .claude/contracts/ADMIN.md.

export type ReportsRange = '7d' | '30d' | '90d'

export interface ReportsKpi {
  /** Sum of `Booking.totalAmount` for paid CONFIRMED/COMPLETED rows in window. */
  grossRevenueCents: number
  /** CONFIRMED + COMPLETED bookings with captured payment in window. */
  bookingCount: number
  /** Sum of `Payment.refundAmount` where `refundStatus = SUCCEEDED` for
   *  bookings whose `startTime` falls in the window (not netted against gross). */
  refundTotalCents: number
  averageBookingCents: number
}

export interface ReportsDailyPoint {
  /** `YYYY-MM-DD` (UTC date of `Booking.startTime` for v1). */
  date: string
  revenueCents: number
  bookingCount: number
}

export interface ReportsTopPackage {
  packageId: string
  packageName: string
  bookingCount: number
  revenueCents: number
}

export interface ReportsSummary {
  range: ReportsRange
  startDate: Date
  endDate: Date
  kpi: ReportsKpi
  daily: ReportsDailyPoint[]
  topPackages: ReportsTopPackage[]
}

function normalizeReportsRangeInput(raw: string | undefined): ReportsRange {
  if (raw === '7d' || raw === '90d') return raw
  return '30d'
}

function reportsDayCount(range: ReportsRange): number {
  if (range === '7d') return 7
  if (range === '90d') return 90
  return 30
}

function utcStartOfCalendarDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  )
}

function utcEndOfCalendarDay(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  )
}

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function enumerateUtcYmdRange(startDate: Date, endDate: Date): string[] {
  const keys: string[] = []
  let cur = utcStartOfCalendarDay(startDate)
  const end = utcStartOfCalendarDay(endDate)
  while (cur <= end) {
    keys.push(utcYmd(cur))
    cur = new Date(cur)
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return keys
}

function isCapturedPayment(
  payment: { status: string } | null | undefined,
): boolean {
  if (!payment) return false
  return payment.status === 'succeeded' || payment.status === 'cash'
}

type ReportBookingRow = {
  id: string
  startTime: Date
  totalAmount: number
  status: string
  packageId: string
  payment: { status: string } | null
  package: { id: string; name: string }
}

function buildReportsSummaryFromBookings(
  range: ReportsRange,
  startDate: Date,
  endDate: Date,
  bookings: ReportBookingRow[],
  refundTotalCents: number,
): ReportsSummary {
  const paidRows = bookings.filter(
    (b) =>
      (b.status === 'CONFIRMED' || b.status === 'COMPLETED') &&
      isCapturedPayment(b.payment),
  )

  let grossRevenueCents = 0
  const dailyAcc = new Map<string, { revenueCents: number; bookingCount: number }>()
  const pkgAcc = new Map<
    string,
    { packageId: string; packageName: string; bookingCount: number; revenueCents: number }
  >()

  for (const b of paidRows) {
    grossRevenueCents += b.totalAmount
    const dayKey = utcYmd(b.startTime)
    const curDay = dailyAcc.get(dayKey) ?? { revenueCents: 0, bookingCount: 0 }
    curDay.revenueCents += b.totalAmount
    curDay.bookingCount += 1
    dailyAcc.set(dayKey, curDay)

    const curPkg =
      pkgAcc.get(b.packageId) ?? {
        packageId: b.packageId,
        packageName: b.package.name,
        bookingCount: 0,
        revenueCents: 0,
      }
    curPkg.bookingCount += 1
    curPkg.revenueCents += b.totalAmount
    pkgAcc.set(b.packageId, curPkg)
  }

  const bookingCount = paidRows.length
  const averageBookingCents =
    bookingCount > 0 ? Math.floor(grossRevenueCents / bookingCount) : 0

  const allDays = enumerateUtcYmdRange(startDate, endDate)
  const daily: ReportsDailyPoint[] = allDays.map((date) => {
    const acc = dailyAcc.get(date)
    return {
      date,
      revenueCents: acc?.revenueCents ?? 0,
      bookingCount: acc?.bookingCount ?? 0,
    }
  })

  const topPackages = [...pkgAcc.values()]
    .sort((a, b) => b.revenueCents - a.revenueCents || b.bookingCount - a.bookingCount)
    .slice(0, 5)

  return {
    range,
    startDate,
    endDate,
    kpi: {
      grossRevenueCents,
      bookingCount,
      refundTotalCents,
      averageBookingCents,
    },
    daily,
    topPackages,
  }
}

function mockReportsSummary(
  tenantId: string,
  range: ReportsRange,
): ReportsSummary {
  void tenantId
  const days = reportsDayCount(range)
  const anchor = new Date('2026-05-13T12:00:00.000Z')
  const endDate = utcEndOfCalendarDay(anchor)
  const start = utcStartOfCalendarDay(anchor)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  const startDate = start

  const daily: ReportsDailyPoint[] = []
  let grossRevenueCents = 0
  let bookingCount = 0
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setUTCDate(startDate.getUTCDate() + i)
    const revenueCents = Math.round(
      6200 + Math.sin(i * 0.55) * 1800 + ((i * 17) % 900),
    )
    const bc = Math.max(1, Math.round(3 + (i % 5) * 0.8))
    const date = utcYmd(d)
    daily.push({ date, revenueCents, bookingCount: bc })
    grossRevenueCents += revenueCents
    bookingCount += bc
  }

  const refundTotalCents = 8900
  const topPackages: ReportsTopPackage[] = [
    {
      packageId: 'pkg-mock-a',
      packageName: 'Classic Bowling',
      bookingCount: 42,
      revenueCents: 158_400,
    },
    {
      packageId: 'pkg-mock-b',
      packageName: 'Birthday Party',
      bookingCount: 11,
      revenueCents: 132_000,
    },
    {
      packageId: 'pkg-mock-c',
      packageName: 'Cosmic Friday',
      bookingCount: 28,
      revenueCents: 98_200,
    },
    {
      packageId: 'pkg-mock-d',
      packageName: 'Pay-Per-Game',
      bookingCount: 19,
      revenueCents: 45_600,
    },
    {
      packageId: 'pkg-mock-e',
      packageName: 'Corporate Event',
      bookingCount: 4,
      revenueCents: 38_000,
    },
  ]

  return {
    range,
    startDate,
    endDate,
    kpi: {
      grossRevenueCents,
      bookingCount,
      refundTotalCents,
      averageBookingCents:
        bookingCount > 0 ? Math.floor(grossRevenueCents / bookingCount) : 0,
    },
    daily,
    topPackages,
  }
}

export async function getReportsSummary(
  tenantId: string,
  rangeInput: string | undefined,
): Promise<ReportsSummary> {
  const user = await requireRole('ADMIN')
  assertAdminTenantAccess(user, tenantId, 'getReportsSummary')
  const range = normalizeReportsRangeInput(rangeInput)

  if (shouldUseDevDbFallback()) {
    warnOnce(
      'reports-db',
      'DATABASE_URL not set — returning mock reports summary for dev.',
    )
    return mockReportsSummary(tenantId, range)
  }

  const dayCount = reportsDayCount(range)
  const now = new Date()
  const endDate = utcEndOfCalendarDay(now)
  const startDate = utcStartOfCalendarDay(now)
  startDate.setUTCDate(startDate.getUTCDate() - (dayCount - 1))

  try {
    const [bookings, refundAgg] = await Promise.all([
      prisma.booking.findMany({
        where: {
          tenantId,
          startTime: { gte: startDate, lte: endDate },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        select: {
          id: true,
          startTime: true,
          totalAmount: true,
          status: true,
          packageId: true,
          payment: { select: { status: true } },
          package: { select: { id: true, name: true } },
        },
      }),
      prisma.payment.aggregate({
        where: {
          refundStatus: 'SUCCEEDED',
          refundAmount: { not: null },
          booking: {
            tenantId,
            startTime: { gte: startDate, lte: endDate },
          },
        },
        _sum: { refundAmount: true },
      }),
    ])

    return buildReportsSummaryFromBookings(
      range,
      startDate,
      endDate,
      bookings,
      refundAgg._sum.refundAmount ?? 0,
    )
  } catch (err) {
    if (shouldUseDevDbFallback(err)) {
      warnOnce(
        'reports-db',
        'Database unreachable — returning mock reports summary for dev. ' +
          'Wake your Neon project or fix DATABASE_URL.',
      )
      return mockReportsSummary(tenantId, range)
    }
    throw err
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
      accessType: 'PUBLIC',
      codeString: null,
      pricingType: null,
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
      accessType: 'PUBLIC',
      codeString: null,
      pricingType: null,
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
      accessType: 'CODE_REQUIRED',
      codeString: 'BDAY25',
      pricingType: null,
    },
  ]
}

/** Stripe Connect onboarding — OAuth account link for the tenant. */
export async function getStripeConnectOnboardingUrl(): Promise<{
  url: string | null
  message: string
}> {
  const user = await requireRole('ADMIN')
  const tenant = await getTenant()
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '')
  const returnUrl = `${baseUrl}/staff/settings/integrations?stripe=return`
  const refreshUrl = `${baseUrl}/staff/settings/integrations?stripe=refresh`

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return {
      url: null,
      message: 'Add STRIPE_SECRET_KEY before connecting Stripe.',
    }
  }

  if (isDevWithoutDb()) {
    return {
      url: returnUrl,
      message: 'Mock Connect onboarding (dev without database).',
    }
  }

  let accountId = tenant.stripeConnectAccountId?.trim() ?? null
  if (!accountId) {
    const created = await createConnectExpressAccount({
      tenantName: tenant.name,
      tenantEmail: user.email ?? undefined,
    })
    accountId = created.accountId
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { stripeConnectAccountId: accountId },
    })
  }

  const link = await createConnectAccountLink({
    accountId,
    returnUrl,
    refreshUrl,
  })

  return {
    url: link.url,
    message: link.mocked
      ? 'Mock Stripe Connect — returning to Integrations.'
      : 'Sign in to Stripe and confirm permissions. You will return here when finished.',
  }
}

export async function getStripeConnectStatus(): Promise<{
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
  accountId: string | null
}> {
  await requireRole('ADMIN')
  const tenant = await getTenant()
  const accountId = tenant.stripeConnectAccountId?.trim() ?? null
  if (!accountId) {
    return {
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      accountId: null,
    }
  }
  const status = await getConnectAccountStatus(accountId)
  return {
    connected: status.detailsSubmitted,
    chargesEnabled: status.chargesEnabled,
    payoutsEnabled: status.payoutsEnabled,
    accountId,
  }
}

export type IntegrationCardState = {
  id: IntegrationId
  title: string
  summary: string
  detail: string
  /** Platform credentials available (env / Connect account). */
  platformReady: boolean
  /** Tenant has completed connect (or Stripe account linked). */
  connected: boolean
  /** Toggle — false pauses use without deleting the connection. */
  enabled: boolean
  required: boolean
  permissions: string[]
}

export async function listIntegrationCardStates(): Promise<IntegrationCardState[]> {
  await requireRole('ADMIN')
  const tenant = await getTenant()
  const prefs = readIntegrationsConfig(tenant.config)

  const stripeAccountId = tenant.stripeConnectAccountId?.trim() ?? null
  let stripeLinked = Boolean(stripeAccountId)
  if (stripeAccountId && !isDevWithoutDb()) {
    const status = await getConnectAccountStatus(stripeAccountId)
    stripeLinked = status.detailsSubmitted || Boolean(stripeAccountId)
  }
  const stripePlatformReady = Boolean(process.env.STRIPE_SECRET_KEY?.trim())
  const resendPlatformReady = hasResendApiKey()
  const makePlatformReady = Boolean(process.env.MAKE_WEBHOOK_URL?.trim())

  const resendConnected = Boolean(prefs.resend?.connected) && resendPlatformReady
  const makeConnected = Boolean(prefs.make?.connected)

  return [
    {
      id: 'stripe',
      title: 'Stripe',
      summary: 'Online payments go directly to your Stripe account.',
      detail: stripeLinked
        ? 'Stripe Connect is linked. Charges settle to your connected account.'
        : 'Connect Stripe so customers can pay online. You will sign in with Stripe and approve payout permissions, then return here.',
      platformReady: stripePlatformReady,
      connected: stripeLinked,
      enabled: isIntegrationEnabled(prefs.stripe, stripeLinked),
      required: true,
      permissions: [
        'Create and manage payment intents for lane bookings',
        'Receive payouts to your bank account',
        'View charge and refund status for this venue',
      ],
    },
    {
      id: 'resend',
      title: 'Resend',
      summary: 'Transactional email for confirmations, updates, and invites.',
      detail: resendConnected
        ? 'Resend is connected. Booking and team emails send through Resend.'
        : resendPlatformReady
          ? 'Connect Resend to send booking confirmations, updates, cancellations, and team invites from this venue.'
          : 'Platform Resend credentials are not configured yet. Ask your operator to set RESEND_API_KEY before connecting.',
      platformReady: resendPlatformReady,
      connected: resendConnected,
      enabled: isIntegrationEnabled(prefs.resend, resendConnected),
      required: false,
      permissions: [
        'Send booking confirmation, update, and cancellation emails',
        'Send team invite and password-reset emails',
        'Use your venue name on outbound messages',
      ],
    },
    {
      id: 'make',
      title: 'Make',
      summary: 'Webhook automation for external workflows.',
      detail: makeConnected
        ? 'Make is connected. Outbound automation webhooks can run for this venue.'
        : makePlatformReady
          ? 'Connect Make to forward booking events to your automation scenarios.'
          : 'Optional. Set MAKE_WEBHOOK_URL on the server, then connect here to enable venue automation.',
      platformReady: makePlatformReady || isDevWithoutDb(),
      connected: makeConnected,
      enabled: isIntegrationEnabled(prefs.make, makeConnected),
      required: false,
      permissions: [
        'Receive booking created / cancelled event payloads',
        'Receive team invite lifecycle hooks (when configured)',
      ],
    },
  ]
}

async function loadTenantRowForConfig() {
  await requireRole('ADMIN')
  const venue = await getTenant()
  if (isDevWithoutDb()) {
    return { tenantId: venue.id, config: venue.config, mocked: true as const }
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: venue.id } })
  if (!tenant) throw new Error('Venue not found.')
  return {
    tenantId: tenant.id,
    config: tenant.config,
    mocked: false as const,
  }
}

function revalidateIntegrations() {
  revalidatePath('/staff/settings/integrations')
  revalidatePath('/staff/settings')
}

/** Soft-connect Resend or Make after the admin confirms permissions in-app. */
export async function connectSoftIntegrationAction(
  id: Exclude<IntegrationId, 'stripe'>,
): Promise<{ ok: true; mocked?: boolean }> {
  const { tenantId, config, mocked } = await loadTenantRowForConfig()
  if (id === 'resend' && !hasResendApiKey() && !mocked) {
    throw new Error('Resend is not configured on the server (RESEND_API_KEY).')
  }
  if (mocked) {
    revalidateIntegrations()
    return { ok: true, mocked: true }
  }
  const next = mergeIntegrationsConfig(config, {
    [id]: {
      connected: true,
      enabled: true,
      connectedAt: new Date().toISOString(),
    },
  })
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { config: next as Prisma.InputJsonValue },
  })
  revalidateIntegrations()
  return { ok: true }
}

export async function setIntegrationEnabledAction(
  id: IntegrationId,
  enabled: boolean,
): Promise<{ ok: true; mocked?: boolean }> {
  const { tenantId, config, mocked } = await loadTenantRowForConfig()
  if (mocked) {
    revalidateIntegrations()
    return { ok: true, mocked: true }
  }
  if (id === 'stripe') {
    const tenant = await getTenant()
    if (!tenant.stripeConnectAccountId?.trim()) {
      throw new Error('Connect Stripe before enabling it.')
    }
  } else {
    const prefs = readIntegrationsConfig(config)
    if (!prefs[id]?.connected) {
      throw new Error('Connect this integration before enabling it.')
    }
  }
  const next = mergeIntegrationsConfig(config, { [id]: { enabled } })
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { config: next as Prisma.InputJsonValue },
  })
  revalidateIntegrations()
  return { ok: true }
}

/** Remove the integration connection (Stripe account id and/or config prefs). */
export async function disconnectIntegrationAction(
  id: IntegrationId,
): Promise<{ ok: true; mocked?: boolean }> {
  const { tenantId, config, mocked } = await loadTenantRowForConfig()
  if (mocked) {
    revalidateIntegrations()
    return { ok: true, mocked: true }
  }
  const nextConfig = removeIntegrationFromConfig(config, id)
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      config: nextConfig as Prisma.InputJsonValue,
      ...(id === 'stripe' ? { stripeConnectAccountId: null } : {}),
    },
  })
  revalidateIntegrations()
  return { ok: true }
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
