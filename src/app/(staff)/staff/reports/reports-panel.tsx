'use client'

import { useRef, useState } from 'react'
import type { Selection } from 'react-aria-components'

import { StaffPageHeader } from '@/components/chrome/staff-page-header'
import { ReportsAnalyticsView } from '@/components/patterns/reports-analytics-view'
import { ReportsContactsView } from '@/components/patterns/reports-contacts-view'
import { ReportsPeriodChips } from '@/components/patterns/reports-period-chips'
import { getStaffContactDetail } from '@/lib/actions/staff-reports'
import type { StaffAnalyticsSummary } from '@/lib/reports-display'
import type {
  StaffContactDetail,
  StaffContactRow,
  StaffContactsSort,
  StaffReportsPeriod,
  StaffReportsSubview,
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

export function ReportsPanel({
  subview,
  period,
  customStart,
  customEnd,
  analytics,
  contacts,
  tenantId,
  bowlersPerLane,
}: ReportsPanelProps) {
  const [contactQuery, setContactQuery] = useState('')
  const [packageFilter, setPackageFilter] = useState('')
  const [contactSort, setContactSort] = useState<StaffContactsSort>({
    column: 'lastBooking',
    direction: 'descending',
  })
  const [contactPage, setContactPage] = useState(1)
  const [contactPageSize, setContactPageSize] = useState(10)
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set())
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactDetail, setContactDetail] = useState<StaffContactDetail | null>(
    null,
  )
  const [contactDetailLoading, setContactDetailLoading] = useState(false)
  const [draftStart, setDraftStart] = useState(customStart ?? '')
  const [draftEnd, setDraftEnd] = useState(customEnd ?? '')
  const contactFetchGen = useRef(0)

  function resetContactPaging() {
    setContactPage(1)
    setSelectedKeys(new Set())
  }

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

  return (
    <div className="flex flex-col gap-8">
      {subview === 'analytics' ? (
        <div className="flex flex-col gap-4">
          <StaffPageHeader title="Reports" />
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
      ) : (
        <ReportsContactsView
          contacts={contacts}
          query={contactQuery}
          onQueryChange={(value) => {
            setContactQuery(value)
            resetContactPaging()
          }}
          packageFilter={packageFilter}
          onPackageFilterChange={(value) => {
            setPackageFilter(value)
            resetContactPaging()
          }}
          sort={contactSort}
          onSortChange={(next) => {
            setContactSort(next)
            resetContactPaging()
          }}
          page={contactPage}
          pageSize={contactPageSize}
          onPageChange={setContactPage}
          onPageSizeChange={(size) => {
            setContactPageSize(size)
            setContactPage(1)
          }}
          selectedKeys={selectedKeys}
          onSelectedKeysChange={setSelectedKeys}
          selectedContactId={selectedContactId}
          onSelectContact={handleSelectContact}
          onCloseDetail={handleCloseContactDetail}
          contactDetail={contactDetail}
          contactDetailLoading={contactDetailLoading}
          tenantId={tenantId}
          bowlersPerLane={bowlersPerLane}
        />
      )}
    </div>
  )
}
