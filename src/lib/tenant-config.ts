/**
 * Pure tenant config helpers — safe for client components.
 *
 * Server-only DB resolution lives in `@/lib/tenant` (`getTenant`).
 * Client code MUST import from this module, never from `@/lib/tenant`.
 */

import type { Tenant } from '@/types'

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
export function getAllowWalkInBookings(tenant: Tenant): boolean {
  const raw = tenant.config?.['allowWalkInBookings']
  return typeof raw === 'boolean' ? raw : true
}

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
      typeof min === 'number' && min >= 0.5 ? min : 1,
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
