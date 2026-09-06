import { StaffPageHeader } from '@/components/chrome/staff-page-header'
import { StaffSupportPanel } from '@/components/patterns/staff-support-panel'
import { getContactEmail } from '@/lib/tenant-config'
import { getTenant } from '@/lib/tenant'

export default async function StaffSupportPage() {
  const tenant = await getTenant()
  const email = getContactEmail(tenant)

  return (
    <>
      <StaffPageHeader
        title="Support"
        subtitle="Venue contacts for staff on shift"
      />
      <StaffSupportPanel
        venueName={tenant.name}
        phone={tenant.phone}
        address={tenant.address}
        email={email}
      />
    </>
  )
}
