/**
 * Tenant resolution for the current deployment.
 *
 * - Pages MUST read venue name, address, phone, and theme via `getTenant()` — never hardcode.
 * - Future multi-tenant routing (subdomain or path param) only rewrites this module; callers stay unchanged.
 *
 * Dev fallback: if `DATABASE_URL` is missing in a non-production environment,
 * `getTenant()` returns a hard-coded "Royal Z Lanes" stub so the booking flow
 * still renders for design work and storybook-style exploration. Production
 * always requires a real DB row (the fallback only kicks in when `NODE_ENV`
 * is not `production`).
 */

import { cache } from 'react'

import { shouldUseDevDbFallback, warnOnce } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import type { Tenant } from '@/types'

const FALLBACK_SLUG = 'royalz'

function resolveTenantSlug(): string {
  const fromEnv = process.env.DEFAULT_TENANT_SLUG?.trim()
  if (fromEnv) return fromEnv
  warnOnce(
    'tenant-slug',
    'DEFAULT_TENANT_SLUG is not set — falling back to "royalz". Set DEFAULT_TENANT_SLUG in production.',
  )
  return FALLBACK_SLUG
}

function mockTenant(slug: string): Tenant {
  return {
    id: `mock-${slug}`,
    name: 'Royal Z Lanes',
    slug,
    address: '123 Bowling Lane, Anytown, USA',
    phone: '(555) 555-0123',
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
  }
}

function mapTenant(row: {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  timezone: string
  themeSlug: string
  holdTimeoutMins: number
  maxOnlineBowlers: number
  cancellationWindowHours: number
  rescheduleWindowHours: number
  checkInWindowMinutes: number
  bowlersPerLane: number
  cancellationRefundPercent: number
  config: unknown
}): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    phone: row.phone,
    timezone: row.timezone,
    themeSlug: row.themeSlug,
    holdTimeoutMins: row.holdTimeoutMins,
    maxOnlineBowlers: row.maxOnlineBowlers,
    cancellationWindowHours: row.cancellationWindowHours,
    rescheduleWindowHours: row.rescheduleWindowHours,
    checkInWindowMinutes: row.checkInWindowMinutes,
    bowlersPerLane: row.bowlersPerLane,
    cancellationRefundPercent: row.cancellationRefundPercent,
    config:
      row.config && typeof row.config === 'object' && !Array.isArray(row.config)
        ? (row.config as Record<string, unknown>)
        : {},
  }
}

/**
 * Cancellation policy read from `Tenant.config`. v1 defaults are:
 *   cancellationWindowHours: 24
 *   cancellationRefundPercent: 100
 *
 * Admins can override per-tenant by writing into the JSON column (the admin
 * UI for editing this is deferred to Phase 11). The customer cancel action
 * MUST resolve via `getCancellationPolicy(tenant)`; do not read the config
 * blob directly.
 */
export interface CancellationPolicy {
  /** How many hours before the booking start a customer can still cancel. */
  windowHours: number
  /** Percentage of totalAmount refunded when within the window (0-100). */
  refundPercent: number
}

const DEFAULT_POLICY: CancellationPolicy = {
  windowHours: 24,
  refundPercent: 100,
}

export function getCancellationPolicy(tenant: Tenant): CancellationPolicy {
  const windowHours =
    tenant.cancellationWindowHours >= 0
      ? tenant.cancellationWindowHours
      : DEFAULT_POLICY.windowHours
  const refundPercent =
    tenant.cancellationRefundPercent >= 0 &&
    tenant.cancellationRefundPercent <= 100
      ? tenant.cancellationRefundPercent
      : DEFAULT_POLICY.refundPercent
  return { windowHours, refundPercent }
}

/** Per-bowler shoe rental in cents — from tenant config, default $4.00. */
export function getShoeRentalPriceCents(tenant: Tenant): number {
  const raw = tenant.config['shoeRentalPriceCents']
  return typeof raw === 'number' && raw >= 0 ? raw : 400
}

/** Lane-only reservation base in cents when no package is selected. */
export function getLaneReservationCents(tenant: Tenant, laneCount: number): number {
  const perLane = tenant.config['laneReservationCentsPerLane']
  const rate = typeof perLane === 'number' && perLane >= 0 ? perLane : 1200
  return rate * laneCount
}

/** Per-lane default rate in cents (before pricing-period overrides). */
export function getLaneReservationCentsPerLane(tenant: Tenant): number {
  const perLane = tenant.config['laneReservationCentsPerLane']
  return typeof perLane === 'number' && perLane >= 0 ? perLane : 1200
}

/** Reply-to for transactional email — from admin venue settings. */
export function getContactEmail(tenant: Tenant): string | null {
  const raw = tenant.config?.['contactEmail']
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 && trimmed.includes('@') ? trimmed : null
}

export type TenantPricingStrategy =
  | 'per_person_hour'
  | 'per_lane_hour'
  | 'per_person_game'
  | 'packages_only'

export function getPricingStrategy(tenant: Tenant): TenantPricingStrategy {
  const raw = tenant.config['pricingStrategy']
  if (
    raw === 'per_lane_hour' ||
    raw === 'per_person_game' ||
    raw === 'packages_only'
  ) {
    return raw
  }
  return 'per_person_hour'
}

export function getBookingDurationLimits(tenant: Tenant): {
  minHours: number
  maxHours: number
} {
  const min = tenant.config['minBookingDurationHours']
  const max = tenant.config['maxBookingDurationHours']
  return {
    minHours:
      typeof min === 'number' && min >= 0.5 ? min : 1.5,
    maxHours: typeof max === 'number' && max >= 1 ? max : 4,
  }
}

/** Hours between booking start and end (fractional). */
export function bookingDurationHours(startTime: Date, endTime: Date): number {
  return (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000)
}

export function assertBookingDurationWithinLimits(
  tenant: Tenant,
  startTime: Date,
  endTime: Date,
): void {
  const { minHours, maxHours } = getBookingDurationLimits(tenant)
  const hours = bookingDurationHours(startTime, endTime)
  if (hours < minHours - 0.01) {
    throw new Error(
      `Minimum booking duration is ${minHours} hour${minHours === 1 ? '' : 's'}.`,
    )
  }
  if (hours > maxHours + 0.01) {
    throw new Error(
      `Maximum booking duration is ${maxHours} hour${maxHours === 1 ? '' : 's'}.`,
    )
  }
}

export const getTenant = cache(async function getTenant(): Promise<Tenant> {
  const slug = resolveTenantSlug()

  if (shouldUseDevDbFallback()) {
    warnOnce(
      'tenant-db',
      `DATABASE_URL not set — returning mock tenant "${slug}" for dev. ` +
        `Run \`npx prisma migrate dev\` and seed the database for real data.`,
    )
    return mockTenant(slug)
  }

  try {
    const row = await prisma.tenant.findUnique({ where: { slug } })
    if (!row) {
      throw new Error(
        `Tenant not found for slug "${slug}". Check DEFAULT_TENANT_SLUG and database seed/migrations.`,
      )
    }
    return mapTenant(row)
  } catch (err) {
    if (shouldUseDevDbFallback(err)) {
      warnOnce(
        'tenant-db',
        `Database unreachable — returning mock tenant "${slug}" for dev. ` +
          `Wake your Neon project or restart \`npm run dev\` after fixing DATABASE_URL.`,
      )
      return mockTenant(slug)
    }
    throw err
  }
})
