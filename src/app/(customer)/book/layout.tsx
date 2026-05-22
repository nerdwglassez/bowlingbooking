import { BookingProvider } from '@/context/BookingContext'
import { getTenant } from '@/lib/tenant'
import { TenantProvider } from './tenant-provider'

export default async function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenant()

  return (
    <TenantProvider
      tenant={{
        id: tenant.id,
        name: tenant.name,
        address: tenant.address,
        phone: tenant.phone,
      }}
    >
      <BookingProvider tenantId={tenant.id}>{children}</BookingProvider>
    </TenantProvider>
  )
}
