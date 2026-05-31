'use client'

import { useRouter } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'

import { ReportsAnalyticsView } from '@/components/patterns/reports-analytics-view'
import { ReportsContactsView } from '@/components/patterns/reports-contacts-view'
import { ReportsPeriodChips } from '@/components/patterns/reports-period-chips'
import { ReportsSubviewToggle } from '@/components/patterns/reports-subview-toggle'
import type { StaffAnalyticsSummary } from '@/lib/reports-display'
import {
  STAFF_REPORTS_SUBVIEW_STORAGE_KEY,
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
}: ReportsPanelProps) {
  const router = useRouter()
  const subview = usePersistedSubview(serverSubview)
  const [contactQuery, setContactQuery] = useState('')
  const [contactSearchExpanded, setContactSearchExpanded] = useState(false)
  const [draftStart, setDraftStart] = useState(customStart ?? '')
  const [draftEnd, setDraftEnd] = useState(customEnd ?? '')

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
        />
      ) : null}
    </div>
  )
}
