import { BookingProvider } from '@/context/BookingContext'
import { loadPricingPeriodsForTenant } from '@/lib/pricing-periods-data'
import {
  getPricingStrategy,
  getShoeRentalPriceCents,
  getTenant,
} from '@/lib/tenant'
import { BookingProviders } from './booking-providers'
import { TenantProvider } from './tenant-provider'

export default async function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenant()
  const perLane = tenant.config['laneReservationCentsPerLane']
  const laneReservationCentsPerLane =
    typeof perLane === 'number' && perLane >= 0 ? perLane : 1200
  const pricingPeriods = await loadPricingPeriodsForTenant(tenant.id)

  return (
    <TenantProvider
      tenant={{
        id: tenant.id,
        name: tenant.name,
        address: tenant.address,
        phone: tenant.phone,
        shoeRentalPriceCents: getShoeRentalPriceCents(tenant),
        laneReservationCentsPerLane,
        maxOnlineBowlers: tenant.maxOnlineBowlers,
        bowlersPerLane: tenant.bowlersPerLane,
        pricingStrategy: getPricingStrategy(tenant),
        pricingPeriods,
      }}
    >
      <BookingProviders>
        <BookingProvider
          tenantId={tenant.id}
          bowlersPerLane={tenant.bowlersPerLane}
        >
          {children}
        </BookingProvider>
      </BookingProviders>
    </TenantProvider>
  )
}
