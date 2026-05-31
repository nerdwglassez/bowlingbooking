'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight, Download, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  contactInitials,
  downloadCsv,
  exportContactsCsv,
  filterContacts,
  formatLastBookingDate,
  type StaffContactRow,
} from '@/lib/reports-display'

export type ReportsContactsViewProps = {
  contacts: StaffContactRow[]
  query: string
  onQueryChange: (value: string) => void
  searchExpanded: boolean
  onSearchExpandedChange: (expanded: boolean) => void
}

export function ReportsContactsView({
  contacts,
  query,
  onQueryChange,
  searchExpanded,
  onSearchExpandedChange,
}: ReportsContactsViewProps) {
  const filtered = useMemo(
    () => filterContacts(contacts, query),
    [contacts, query],
  )

  return (
    <div className="flex flex-col gap-4">
      {!searchExpanded && !query ? (
        <button
          type="button"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-3 py-2.5 opacity-45"
          onClick={() => onSearchExpandedChange(true)}
        >
          <Search className="size-3.5 text-[var(--color-text-muted)]" aria-hidden />
          <span className="text-[13px] text-[var(--color-text-muted)]">
            Search contacts…
          </span>
        </button>
      ) : (
        <div className="relative flex items-center gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-3 py-2.5">
          <Search className="size-3.5 text-[var(--color-text-muted)]" aria-hidden />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search contacts…"
            className="h-auto min-h-0 flex-1 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0"
            aria-label="Search contacts"
            autoFocus
          />
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-[var(--color-action-dark)]"
            onClick={() => {
              onQueryChange('')
              onSearchExpandedChange(false)
            }}
          >
            Cancel
          </button>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        {filtered.length} contact{filtered.length === 1 ? '' : 's'} · sorted by
        last booking
      </p>

      <div>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
            {query ? `No contacts match "${query}"` : 'No contacts yet.'}
          </p>
        ) : (
          filtered.map((contact) => (
            <Link
              key={contact.id}
              href={`/staff/reports/contacts/${contact.id}`}
              className="flex items-center gap-3 border-b border-solid border-[var(--color-border)] py-2.5 last:border-0"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--surface-raised)] text-xs font-semibold text-[var(--color-text-secondary)]">
                {contactInitials(contact.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {contact.name}
                </div>
                <div className="text-[10px] leading-snug text-[var(--color-text-muted)]">
                  {contact.email}
                  {contact.phone ? ` · ${contact.phone}` : ''}
                  <br />
                  Last booking {formatLastBookingDate(contact.lastBookingDate)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                  {contact.bookingCount}
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)]">
                  bookings
                </div>
              </div>
              <ChevronRight
                className="size-3.5 shrink-0 text-[var(--color-text-muted)]"
                aria-hidden
              />
            </Link>
          ))
        )}
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border-[1.5px] border-solid border-[var(--color-border-strong)] bg-transparent py-2.5 text-xs font-medium text-[var(--color-text-secondary)]"
        onClick={() =>
          downloadCsv('contacts.csv', exportContactsCsv(filtered))
        }
      >
        <Download className="size-3.5" aria-hidden />
        Export contacts as CSV
      </button>
    </div>
  )
}
