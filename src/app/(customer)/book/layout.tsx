import { BookingProvider } from '@/context/BookingContext'
import { getTenant, getShoeRentalPriceCents } from '@/lib/tenant'
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

  return (
    <TenantProvider
      tenant={{
        id: tenant.id,
        name: tenant.name,
        address: tenant.address,
        phone: tenant.phone,
        shoeRentalPriceCents: getShoeRentalPriceCents(tenant),
        laneReservationCentsPerLane,
      }}
    >
      <BookingProviders>
        <BookingProvider tenantId={tenant.id}>{children}</BookingProvider>
      </BookingProviders>
    </TenantProvider>
  )
}
