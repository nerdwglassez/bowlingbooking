'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, Download01 } from '@untitledui/icons'

import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { BookingDetailLoader } from '@/components/chrome/booking-detail-sheet'
import { BookingModifySheet } from '@/components/chrome/booking-modify-sheet'
import { ContactBookingHistory } from '@/components/patterns/contact-booking-history'
import type { StaffBookingDetail } from '@/lib/actions/staff'
import {
  contactInitials,
  downloadCsv,
  exportContactHistoryCsv,
  formatCustomerSince,
  formatMetricMoney,
  type StaffContactDetail,
} from '@/lib/reports-display'

export type ContactDetailPanelProps = {
  contact: StaffContactDetail
  embedded?: boolean
  tenantId: string
  bowlersPerLane?: number
  canRefund?: boolean
}

export function ContactDetailPanel({
  contact,
  embedded = false,
  tenantId,
  bowlersPerLane = 6,
  canRefund = false,
}: ContactDetailPanelProps) {
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [modifyOpen, setModifyOpen] = useState(false)
  const [bookingForModify, setBookingForModify] =
    useState<StaffBookingDetail | null>(null)
  const [detailKey, setDetailKey] = useState(0)

  useEffect(() => {
    setBookingId(null)
    setModifyOpen(false)
    setBookingForModify(null)
  }, [contact.id])

  useEffect(() => {
    if (!bookingId) return
    const dialog = document.querySelector('[role="dialog"]')
    dialog?.scrollTo({ top: 0 })
  }, [bookingId])

  return (
    <>
      {bookingId ? (
        <div className="flex flex-col gap-4 motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-200">
          <Button
            type="button"
            color="link-gray"
            size="sm"
            iconLeading={ChevronLeft}
            onClick={() => setBookingId(null)}
          >
            {contact.name}
          </Button>
          <BookingDetailLoader
            key={`${bookingId}-${detailKey}`}
            bookingId={bookingId}
            canRefund={canRefund}
            onModify={(booking) => {
              setBookingForModify(booking)
              setModifyOpen(true)
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {!embedded ? (
            <Button
              href="/staff/reports?view=contacts"
              color="link-gray"
              size="sm"
              iconLeading={ChevronLeft}
            >
              Contacts
            </Button>
          ) : null}

          <div className="flex items-center gap-3.5 border-b border-secondary pb-5">
            <Avatar size="lg" initials={contactInitials(contact.name)} />
            <div>
              <h1 className="text-display-sm font-semibold leading-tight text-primary">
                {contact.name}
              </h1>
              <div className="mt-0.5 text-sm leading-snug text-tertiary">
                <a
                  href={`mailto:${contact.email}`}
                  className="text-brand-secondary"
                >
                  {contact.email}
                </a>
                {contact.phone ? (
                  <>
                    <br />
                    <a
                      href={`tel:${contact.phone.replace(/\D/g, '')}`}
                      className="text-brand-secondary"
                    >
                      {contact.phone}
                    </a>
                  </>
                ) : null}
                <br />
                Customer since {formatCustomerSince(contact.customerSince)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-secondary ring-1 ring-secondary">
            <div className="bg-primary px-2 py-3 text-center">
              <div className="text-lg font-semibold text-primary">
                {contact.bookingCount}
              </div>
              <div className="mt-0.5 text-xs font-medium text-tertiary">
                Bookings
              </div>
            </div>
            <div className="bg-primary px-2 py-3 text-center">
              <div className="text-lg font-semibold text-brand-secondary">
                {formatMetricMoney(contact.totalSpentCents)}
              </div>
              <div className="mt-0.5 text-xs font-medium text-tertiary">
                Total spent
              </div>
            </div>
            <div className="bg-primary px-2 py-3 text-center">
              <div className="text-lg font-semibold text-primary">
                {formatMetricMoney(contact.avgBookingCents)}
              </div>
              <div className="mt-0.5 text-xs font-medium text-tertiary">
                Avg booking
              </div>
            </div>
          </div>

          <Button
            type="button"
            color="secondary"
            iconLeading={Download01}
            onClick={() =>
              downloadCsv(
                `${contact.name.replace(/\s+/g, '-').toLowerCase()}-history.csv`,
                exportContactHistoryCsv(contact),
              )
            }
          >
            Export booking history as CSV
          </Button>

          <ContactBookingHistory
            items={contact.history}
            hiddenCount={contact.hiddenHistoryCount}
            onSelectBooking={setBookingId}
          />
        </div>
      )}

      <BookingModifySheet
        open={modifyOpen}
        booking={bookingForModify}
        tenantId={tenantId}
        bowlersPerLane={bowlersPerLane}
        onClose={() => setModifyOpen(false)}
        onSaved={() => {
          setModifyOpen(false)
          setDetailKey((k) => k + 1)
        }}
      />
    </>
  )
}
