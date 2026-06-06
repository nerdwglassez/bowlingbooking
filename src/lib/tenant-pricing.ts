// tenant-pricing.ts — Resolve tenant pricing config + periods for booking totals.

import type { PricingPeriod } from '@prisma/client'

import { resolvePricingPeriod } from '@/lib/pricing-period'
import type { Tenant } from '@/types'
import {
  getLaneReservationCentsPerLane,
  getPricingStrategy,
  type TenantPricingStrategy,
} from '@/lib/tenant-config'

export type { TenantPricingStrategy }

export interface TenantPricingQuoteInput {
  tenant: Tenant
  periods: PricingPeriod[]
  bowlerCount: number
  laneCount: number
  startTime: Date
  endTime: Date
  gamesPerBowler?: number
}

/** Cents per unit for the resolved period, or tenant default rate. */
export function resolveRateCentsForBooking(
  input: TenantPricingQuoteInput,
): number {
  const period = resolvePricingPeriod(input.periods, input.startTime)
  if (period) return period.ratePerPersonPerHour
  return getLaneReservationCentsPerLane(input.tenant)
}

export function resolveStrategyForBooking(tenant: Tenant): TenantPricingStrategy {
  return getPricingStrategy(tenant)
}

export interface LanePricingContext {
  strategy: TenantPricingStrategy
  rateCents: number
  startTime: Date
  endTime: Date
}

/** Lane-only booking totals — undefined when strategy is packages_only. */
export function buildLanePricingContext(input: {
  strategy: TenantPricingStrategy
  periods: PricingPeriod[]
  defaultRateCentsPerLane: number
  bowlerCount: number
  laneCount: number
  startTime: Date
  endTime: Date
}): LanePricingContext | undefined {
  if (input.strategy === 'packages_only') return undefined
  const period = resolvePricingPeriod(input.periods, input.startTime)
  const rateCents = period
    ? period.ratePerPersonPerHour
    : input.defaultRateCentsPerLane
  return {
    strategy: input.strategy,
    rateCents,
    startTime: input.startTime,
    endTime: input.endTime,
  }
}
