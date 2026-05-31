'use client'

import Link from 'next/link'
import { ChevronLeft, Download } from 'lucide-react'

import { ContactBookingHistory } from '@/components/patterns/contact-booking-history'
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
}

export function ContactDetailPanel({ contact }: ContactDetailPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/staff/reports?view=contacts"
        className="flex w-fit items-center gap-1.5 text-xs text-[var(--color-text-muted)]"
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        Contacts
      </Link>

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
      />
    </div>
  )
}
