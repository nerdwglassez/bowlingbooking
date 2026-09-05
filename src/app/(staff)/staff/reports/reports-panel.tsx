'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useSyncExternalStore } from 'react'

import { ReportsAnalyticsView } from '@/components/patterns/reports-analytics-view'
import { ReportsContactsView } from '@/components/patterns/reports-contacts-view'
import { ReportsPeriodChips } from '@/components/patterns/reports-period-chips'
import { ReportsSubviewToggle } from '@/components/patterns/reports-subview-toggle'
import { getStaffContactDetail } from '@/lib/actions/staff-reports'
import type { StaffAnalyticsSummary } from '@/lib/reports-display'
import {
  STAFF_REPORTS_SUBVIEW_STORAGE_KEY,
  type StaffContactDetail,
  type StaffContactRow,
  type StaffReportsPeriod,
  type StaffReportsSubview,
} from '@/lib/reports-display'

export type ReportsPanelProps = {
  subview: StaffReportsSubview
  period: StaffReportsPeriod
  customStart?: string
  customEnd?: string
  analytics: StaffAnalyticsSummary
  contacts: StaffContactRow[]
  tenantId: string
  bowlersPerLane: number
}

function readPersistedSubview(): StaffReportsSubview | null {
  const stored = localStorage.getItem(STAFF_REPORTS_SUBVIEW_STORAGE_KEY)
  if (stored === 'analytics' || stored === 'contacts') return stored
  return null
}

function subscribeSubview(onChange: () => void) {
  const handler = () => onChange()
  window.addEventListener(STAFF_REPORTS_SUBVIEW_STORAGE_KEY, handler)
  return () => window.removeEventListener(STAFF_REPORTS_SUBVIEW_STORAGE_KEY, handler)
}

function usePersistedSubview(
  serverSubview: StaffReportsSubview,
): StaffReportsSubview {
  const stored = useSyncExternalStore(
    subscribeSubview,
    readPersistedSubview,
    () => null,
  )
  return stored ?? serverSubview
}

export function ReportsPanel({
  subview: serverSubview,
  period,
  customStart,
  customEnd,
  analytics,
  contacts,
  tenantId,
  bowlersPerLane,
}: ReportsPanelProps) {
  const router = useRouter()
  const subview = usePersistedSubview(serverSubview)
  const [contactQuery, setContactQuery] = useState('')
  const [contactSearchExpanded, setContactSearchExpanded] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactDetail, setContactDetail] = useState<StaffContactDetail | null>(
    null,
  )
  const [contactDetailLoading, setContactDetailLoading] = useState(false)
  const [draftStart, setDraftStart] = useState(customStart ?? '')
  const [draftEnd, setDraftEnd] = useState(customEnd ?? '')
  const contactFetchGen = useRef(0)

  function handleSelectContact(contactId: string) {
    setSelectedContactId(contactId)
    setContactDetail(null)
    setContactDetailLoading(true)
    const gen = ++contactFetchGen.current
    void getStaffContactDetail(tenantId, contactId).then((row) => {
      if (gen !== contactFetchGen.current) return
      setContactDetail(row)
      setContactDetailLoading(false)
    })
  }

  function handleCloseContactDetail() {
    contactFetchGen.current += 1
    setSelectedContactId(null)
    setContactDetail(null)
    setContactDetailLoading(false)
  }

  const handleSubviewChange = (next: StaffReportsSubview) => {
    localStorage.setItem(STAFF_REPORTS_SUBVIEW_STORAGE_KEY, next)
    window.dispatchEvent(new Event(STAFF_REPORTS_SUBVIEW_STORAGE_KEY))

    const params = new URLSearchParams()
    if (next === 'contacts') params.set('view', 'contacts')
    if (period !== 'month') params.set('period', period)
    if (period === 'custom' && customStart && customEnd) {
      params.set('start', customStart)
      params.set('end', customEnd)
    }
    const qs = params.toString()
    router.push(qs ? `/staff/reports?${qs}` : '/staff/reports', { scroll: false })
  }

  const activeSubview = subview

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl [font-family:var(--font-display)] text-[var(--color-text-primary)]">
          Reports
        </h1>
        <ReportsSubviewToggle value={activeSubview} onChange={handleSubviewChange} />
      </header>

      {activeSubview === 'analytics' ? (
        <div className="flex flex-col gap-4">
          <ReportsPeriodChips
            period={period}
            customStart={customStart}
            customEnd={customEnd}
            view="analytics"
            draftStart={draftStart}
            draftEnd={draftEnd}
            onDraftStartChange={setDraftStart}
            onDraftEndChange={setDraftEnd}
          />
          <ReportsAnalyticsView summary={analytics} />
        </div>
      ) : null}

      {activeSubview === 'contacts' ? (
        <ReportsContactsView
          contacts={contacts}
          query={contactQuery}
          onQueryChange={setContactQuery}
          searchExpanded={contactSearchExpanded}
          onSearchExpandedChange={setContactSearchExpanded}
          selectedContactId={selectedContactId}
          onSelectContact={handleSelectContact}
          onCloseDetail={handleCloseContactDetail}
          contactDetail={contactDetail}
          contactDetailLoading={contactDetailLoading}
          tenantId={tenantId}
          bowlersPerLane={bowlersPerLane}
        />
      ) : null}
    </div>
  )
}
