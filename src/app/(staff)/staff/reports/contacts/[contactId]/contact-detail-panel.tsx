'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Download } from 'lucide-react'

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
    if (!bookingId) return
    const dialog = document.querySelector('[role="dialog"]')
    dialog?.scrollTo({ top: 0 })
  }, [bookingId])

  return (
    <>
      {bookingId ? (
        <div className="flex flex-col gap-4 motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-200">
          <button
            type="button"
            className="flex w-fit items-center gap-1.5 text-xs text-[var(--color-text-muted)]"
            onClick={() => setBookingId(null)}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            {contact.name}
          </button>
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
            <Link
              href="/staff/reports?view=contacts"
              className="flex w-fit items-center gap-1.5 text-xs text-[var(--color-text-muted)]"
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Contacts
            </Link>
          ) : null}

          <div className="flex items-center gap-3.5 border-b border-solid border-[var(--color-border)] pb-5">
            <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface-raised)] text-lg font-semibold text-[var(--color-text-secondary)]">
              {contactInitials(contact.name)}
            </div>
            <div>
              <h1 className="text-2xl [font-family:var(--font-display)] leading-tight text-[var(--color-text-primary)]">
                {contact.name}
              </h1>
              <div className="mt-0.5 text-[11px] leading-snug text-[var(--color-text-muted)]">
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[var(--color-action-dark)]"
                >
                  {contact.email}
                </a>
                {contact.phone ? (
                  <>
                    <br />
                    <a
                      href={`tel:${contact.phone.replace(/\D/g, '')}`}
                      className="text-[var(--color-action-dark)]"
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

          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--color-border)]">
            <div className="bg-[var(--surface-ground)] px-2 py-3 text-center">
              <div className="[font-family:var(--font-display)] text-lg text-[var(--color-text-primary)]">
                {contact.bookingCount}
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Bookings
              </div>
            </div>
            <div className="bg-[var(--surface-ground)] px-2 py-3 text-center">
              <div className="[font-family:var(--font-display)] text-lg text-[var(--color-action-dark)]">
                {formatMetricMoney(contact.totalSpentCents)}
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Total spent
              </div>
            </div>
            <div className="bg-[var(--surface-ground)] px-2 py-3 text-center">
              <div className="[font-family:var(--font-display)] text-lg text-[var(--color-text-primary)]">
                {formatMetricMoney(contact.avgBookingCents)}
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Avg booking
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-[1.5px] border-solid border-[var(--color-border-strong)] bg-transparent py-2.5 text-xs font-medium text-[var(--color-text-secondary)]"
            onClick={() =>
              downloadCsv(
                `${contact.name.replace(/\s+/g, '-').toLowerCase()}-history.csv`,
                exportContactHistoryCsv(contact),
              )
            }
          >
            <Download className="size-3.5" aria-hidden />
            Export booking history as CSV
          </button>

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
