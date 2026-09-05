// /staff/reports — analytics & contacts (MANAGER+).

import { requireRole } from '@/lib/auth'
import {
  getStaffAnalyticsSummary,
  listStaffContacts,
} from '@/lib/actions/staff-reports'
import {
  normalizeStaffReportsPeriod,
  normalizeStaffReportsSubview,
} from '@/lib/reports-display'
import { getTenant } from '@/lib/tenant'

import { ReportsPanel } from './reports-panel'

type PageProps = {
  searchParams: Promise<{
    view?: string
    period?: string
    start?: string
    end?: string
  }>
}

export default async function StaffReportsPage({ searchParams }: PageProps) {
  await requireRole('MANAGER', 'ADMIN')
  const params = await searchParams
  const tenant = await getTenant()
  const subview = normalizeStaffReportsSubview(params.view)
  const period = normalizeStaffReportsPeriod(params.period)

  const [analytics, contacts] = await Promise.all([
    getStaffAnalyticsSummary(
      tenant.id,
      params.period,
      params.start,
      params.end,
    ),
    listStaffContacts(tenant.id),
  ])

  return (
    <ReportsPanel
      subview={subview}
      period={period}
      customStart={params.start}
      customEnd={params.end}
      analytics={analytics}
      contacts={contacts}
      tenantId={tenant.id}
      bowlersPerLane={tenant.bowlersPerLane}
    />
  )
}
