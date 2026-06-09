'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Download, Search } from 'lucide-react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { ContactDetailPanel } from '@/app/(staff)/staff/reports/contacts/[contactId]/contact-detail-panel'
import { Input } from '@/components/ui/input'
import {
  contactInitials,
  downloadCsv,
  exportContactsCsv,
  filterContacts,
  formatLastBookingDate,
  type StaffContactDetail,
  type StaffContactRow,
} from '@/lib/reports-display'

export type ReportsContactsViewProps = {
  contacts: StaffContactRow[]
  query: string
  onQueryChange: (value: string) => void
  searchExpanded: boolean
  onSearchExpandedChange: (expanded: boolean) => void
  selectedContactId: string | null
  onSelectContact: (contactId: string) => void
  onCloseDetail: () => void
  contactDetail: StaffContactDetail | null
  contactDetailLoading: boolean
}

export function ReportsContactsView({
  contacts,
  query,
  onQueryChange,
  searchExpanded,
  onSearchExpandedChange,
  selectedContactId,
  onSelectContact,
  onCloseDetail,
  contactDetail,
  contactDetailLoading,
}: ReportsContactsViewProps) {
  const router = useRouter()
  const filtered = useMemo(
    () => filterContacts(contacts, query),
    [contacts, query],
  )

  function handleSelect(contactId: string) {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      onSelectContact(contactId)
      return
    }
    router.push(`/staff/reports/contacts/${contactId}`)
  }

  const list = (
    <div className="flex flex-col gap-4 md:min-w-0 md:flex-1">
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
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSelect(contact.id)}
              className={`flex w-full items-center gap-3 border-b border-solid border-[var(--color-border)] py-2.5 text-left last:border-0 ${
                selectedContactId === contact.id
                  ? 'bg-[color-mix(in_srgb,var(--color-action-subtle)_12%,transparent)]'
                  : ''
              }`}
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
                className="size-3.5 shrink-0 text-[var(--color-text-muted)] md:hidden"
                aria-hidden
              />
            </button>
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

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        {list}
        <div className="hidden md:block md:w-[400px] md:shrink-0">
          {selectedContactId ? (
            contactDetailLoading || !contactDetail ? (
              <p className="py-8 text-sm text-[var(--color-text-secondary)]">
                Loading contact…
              </p>
            ) : (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--surface-card)] p-4">
                <ContactDetailPanel contact={contactDetail} embedded />
              </div>
            )
          ) : (
            <p className="py-8 text-sm text-[var(--color-text-muted)]">
              Select a contact to view details
            </p>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <BottomSheet
          open={selectedContactId != null && contactDetail != null}
          title={contactDetail?.name ?? 'Contact'}
          onClose={onCloseDetail}
        >
          {contactDetail ? (
            <div className="p-4">
              <ContactDetailPanel contact={contactDetail} embedded />
            </div>
          ) : null}
        </BottomSheet>
      </div>
    </>
  )
}
