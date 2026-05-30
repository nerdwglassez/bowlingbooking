'use client'

// tenant-provider.tsx — Client-side tenant context for the booking flow.
// The server layout calls getTenant() once and passes the resolved chrome
// fields down so client pages can render the VenueHeader without each one
// re-fetching.

import { createContext, useContext, type ReactNode } from 'react'

export interface TenantChrome {
  id: string
  name: string
  address: string
  phone: string
  shoeRentalPriceCents: number
  laneReservationCentsPerLane: number
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
