'use client'

// tenant-provider.tsx — Client-side tenant context for the booking flow.
// The server layout calls getTenant() once and passes the resolved chrome
// fields down so client pages can render the VenueHeader without each one
// re-fetching.

import { useMemo, createContext, useContext, type ReactNode } from 'react'
import type { PricingPeriod } from '@/generated/prisma/client'

import { buildLanePricingContext } from '@/lib/tenant-pricing'
import type { LanePricingContext, TenantPricingStrategy } from '@/lib/tenant-pricing'

export interface TenantChrome {
  id: string
  name: string
  address: string
  phone: string
  shoeRentalPriceCents: number
  laneReservationCentsPerLane: number
  maxOnlineBowlers: number
  bowlersPerLane: number
  pricingStrategy: TenantPricingStrategy
  pricingPeriods: PricingPeriod[]
  hasLegacyPromoCodes: boolean
}

const TenantContext = createContext<TenantChrome | null>(null)

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantChrome
  children: ReactNode
}) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  )
}

export function useTenant(): TenantChrome {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenant must be used inside TenantProvider')
  }
  return ctx
}

/** Strategy + period rate for lane-only totals (matches server confirmBooking). */
export function useLanePricingContext(input: {
  bowlerCount: number
  laneCount: number
  startTime: Date | null
  endTime: Date | null
}): LanePricingContext | undefined {
  const tenant = useTenant()
  return useMemo(() => {
    if (input.startTime == null || input.endTime == null) return undefined
    return buildLanePricingContext({
      strategy: tenant.pricingStrategy,
      periods: tenant.pricingPeriods,
      defaultRateCentsPerLane: tenant.laneReservationCentsPerLane,
      bowlerCount: input.bowlerCount,
      laneCount: input.laneCount,
      startTime: input.startTime,
      endTime: input.endTime,
    })
  }, [
    tenant.pricingStrategy,
    tenant.pricingPeriods,
    tenant.laneReservationCentsPerLane,
    input.bowlerCount,
    input.laneCount,
    input.startTime,
    input.endTime,
  ])
}
