// /staff/reports/contacts/[contactId] — contact profile + booking history.

import { notFound } from 'next/navigation'

import { requireRole } from '@/lib/auth'
import { getStaffContactDetail } from '@/lib/actions/staff-reports'
import { getTenant } from '@/lib/tenant'

import { ContactDetailPanel } from './contact-detail-panel'

type PageProps = {
  params: Promise<{ contactId: string }>
}

export default async function StaffContactDetailPage({ params }: PageProps) {
  await requireRole('MANAGER', 'ADMIN')
  const { contactId } = await params
  const tenant = await getTenant()
  const contact = await getStaffContactDetail(tenant.id, contactId)
  if (!contact) notFound()

  return (
    <ContactDetailPanel
      contact={contact}
      tenantId={tenant.id}
      bowlersPerLane={tenant.bowlersPerLane}
      canRefund
    />
  )
}
