'use client'

import { useMemo, useRef, useState } from 'react'

import { StaffPageHeader } from '@/components/chrome/staff-page-header'
import { ReportsAnalyticsView } from '@/components/patterns/reports-analytics-view'
import {
  ReportsContactsHeaderActions,
  ReportsContactsView,
} from './reports-contacts-panel'
import { ReportsPeriodChips } from '@/components/patterns/reports-period-chips'
import { getStaffContactDetail } from '@/lib/actions/staff-reports'
import {
  downloadCsv,
  exportContactsCsv,
  filterContacts,
  type StaffAnalyticsSummary,
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
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [contactDetail, setContactDetail] = useState<StaffContactDetail | null>(
    null,
  )
  const [contactDetailLoading, setContactDetailLoading] = useState(false)
  const [draftStart, setDraftStart] = useState(customStart ?? '')
  const [draftEnd, setDraftEnd] = useState(customEnd ?? '')
  const contactFetchGen = useRef(0)

  const exportRows = useMemo(
    () => filterContacts(contacts, contactQuery),
    [contacts, contactQuery],
  )

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

  const isContacts = subview === 'contacts'

  return (
    <div className="flex flex-col gap-6">
      <StaffPageHeader
        title={isContacts ? 'Contacts' : 'Reports'}
        subtitle={
          isContacts
            ? 'Customers who have booked with this venue'
            : undefined
        }
        actions={
          isContacts ? (
            <ReportsContactsHeaderActions
              query={contactQuery}
              onQueryChange={setContactQuery}
              onExport={() =>
                downloadCsv('contacts.csv', exportContactsCsv(exportRows))
              }
            />
          ) : undefined
        }
      />

      {!isContacts ? (
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
      ) : (
        <ReportsContactsView
          contacts={contacts}
          query={contactQuery}
          onQueryChange={setContactQuery}
          headerSearch
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
