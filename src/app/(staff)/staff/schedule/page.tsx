// /staff/schedule — month calendar, day detail, and lane blocking.
//
// Wireframe: docs/wireframes/staff/schedule-calendar-blocking.html
// Spec: .claude/staff/04_SCHEDULE.md

import { getCurrentUser } from '@/lib/auth'
import {
  getScheduleForDate,
  getScheduleForMonth,
} from '@/lib/actions/staff'
import { getTenant } from '@/lib/tenant'
import {
  isoDateLocal,
  monthParam,
  parseMonthParam,
} from '@/lib/schedule-display'

import {
  SchedulePanel,
  type ScheduleView,
} from './schedule-panel'

type PageProps = {
  searchParams: Promise<{
    month?: string
    date?: string
    view?: string
  }>
}

export default async function StaffSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams
  const today = new Date()
  const todayISO = isoDateLocal(today)
  const selectedDate = params.date ?? todayISO
  const { year, month } = parseMonthParam(params.month, today)
  const monthKey = monthParam(year, month)
  const view: ScheduleView = params.view === 'list' ? 'list' : 'calendar'

  const tenant = await getTenant()
  const user = await getCurrentUser()
  const canManageBlocks = user?.role === 'ADMIN'

  const [monthSummary, daySchedule] = await Promise.all([
    getScheduleForMonth(tenant.id, year, month),
    getScheduleForDate(tenant.id, selectedDate),
  ])

  return (
    <SchedulePanel
      tenantId={tenant.id}
      totalLanes={monthSummary.totalLanes}
      month={monthKey}
      selectedDate={selectedDate}
      todayISO={todayISO}
      view={view}
      monthDays={monthSummary.days}
      monthBlocks={monthSummary.blocks}
      dayBookings={daySchedule.bookings}
      dayBlocks={daySchedule.blocks}
      canManageBlocks={canManageBlocks}
    />
  )
}
