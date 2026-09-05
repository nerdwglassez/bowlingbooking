'use client'

import { useMemo } from 'react'
import { Download01, Eye, SearchLg, Users01 } from '@untitledui/icons'
import type { Selection, SortDescriptor } from 'react-aria-components'

import { EmptyState } from '@/components/application/empty-state/empty-state'
import { PaginationCardMinimal } from '@/components/application/pagination/pagination'
import { Table, TableCard } from '@/components/application/table/table'
import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { Dropdown } from '@/components/base/dropdown/dropdown'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { ContactDetailPanel } from '@/app/(staff)/staff/reports/contacts/[contactId]/contact-detail-panel'
import {
  contactInitials,
  downloadCsv,
  exportContactsCsv,
  filterContacts,
  filterContactsByPackage,
  formatContactTableDate,
  paginateContacts,
  sortContacts,
  uniqueContactPackages,
  type StaffContactDetail,
  type StaffContactRow,
  type StaffContactsSort,
} from '@/lib/reports-display'

export type ReportsContactsViewProps = {
  contacts: StaffContactRow[]
  query: string
  onQueryChange: (value: string) => void
  packageFilter: string
  onPackageFilterChange: (value: string) => void
  sort: StaffContactsSort
  onSortChange: (sort: StaffContactsSort) => void
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  selectedKeys: Selection
  onSelectedKeysChange: (keys: Selection) => void
  selectedContactId: string | null
  onSelectContact: (contactId: string) => void
  onCloseDetail: () => void
  contactDetail: StaffContactDetail | null
  contactDetailLoading: boolean
  tenantId: string
  bowlersPerLane?: number
}

export function ReportsContactsView({
  contacts,
  query,
  onQueryChange,
  packageFilter,
  onPackageFilterChange,
  sort,
  onSortChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectedKeys,
  onSelectedKeysChange,
  selectedContactId,
  onSelectContact,
  onCloseDetail,
  contactDetail,
  contactDetailLoading,
  tenantId,
  bowlersPerLane,
}: ReportsContactsViewProps) {
  const packages = useMemo(() => uniqueContactPackages(contacts), [contacts])
  const filtered = useMemo(
    () =>
      sortContacts(
        filterContactsByPackage(filterContacts(contacts, query), packageFilter),
        sort,
      ),
    [contacts, packageFilter, query, sort],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const visible = useMemo(
    () => paginateContacts(filtered, safePage, pageSize),
    [filtered, pageSize, safePage],
  )

  const exportRows = useMemo(() => {
    if (selectedKeys === 'all') return filtered
    if (selectedKeys.size > 0) {
      return filtered.filter((contact) => selectedKeys.has(contact.id))
    }
    return filtered
  }, [filtered, selectedKeys])

  function handleExport(rows: StaffContactRow[] = exportRows) {
    downloadCsv('contacts.csv', exportContactsCsv(rows))
  }

  const sortDescriptor: SortDescriptor = {
    column: sort.column,
    direction: sort.direction,
  }

  const emptyTitle = query
    ? `No contacts match "${query}"`
    : packageFilter
      ? 'No contacts for this package'
      : 'No contacts yet.'
  const emptyDescription = query
    ? 'Try a different name, email, or phone number.'
    : packageFilter
      ? 'Clear the package filter to see every contact.'
      : 'Bookings will appear here as guests reserve lanes.'

  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-display-sm font-semibold text-primary">Contacts</h1>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button
            type="button"
            color="primary"
            iconLeading={Download01}
            onClick={() => handleExport()}
          >
            Export Contacts CSV
          </Button>
          <Input
            icon={SearchLg}
            value={query}
            onChange={onQueryChange}
            placeholder="Search"
            aria-label="Search contacts"
            className="w-full sm:max-w-[280px] sm:min-w-[200px]"
          />
        </div>
      </div>

      <TableCard.Root>
        <TableCard.Header
          title="Contacts"
          badge={`${filtered.length} ${filtered.length === 1 ? 'contact' : 'contacts'}`}
          contentTrailing={
            packages.length > 0 ? (
              <NativeSelect
                aria-label="Filter by package"
                size="sm"
                value={packageFilter}
                onChange={(event) => onPackageFilterChange(event.target.value)}
                options={[
                  { label: 'All Packages', value: '' },
                  ...packages.map((name) => ({ label: name, value: name })),
                ]}
              />
            ) : null
          }
        />

        {filtered.length === 0 ? (
          <EmptyState size="sm" className="px-4 py-10">
            <EmptyState.Header pattern="none">
              <EmptyState.FeaturedIcon
                icon={Users01}
                color="gray"
                theme="modern"
              />
            </EmptyState.Header>
            <EmptyState.Content>
              <EmptyState.Title>{emptyTitle}</EmptyState.Title>
              <EmptyState.Description>{emptyDescription}</EmptyState.Description>
            </EmptyState.Content>
          </EmptyState>
        ) : (
          <>
            <ul className="flex flex-col lg:hidden">
              {visible.map((contact) => (
                <li key={contact.id} className="border-b border-secondary last:border-0">
                  <button
                    type="button"
                    onClick={() => onSelectContact(contact.id)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left"
                  >
                    <Avatar
                      size="md"
                      initials={contactInitials(contact.name)}
                      alt={contact.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary">
                        {contact.name}
                      </p>
                      <p className="truncate text-sm text-tertiary">
                        {contact.email}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm text-tertiary">{contact.bookingCount}</p>
                      <p className="text-xs text-tertiary">
                        {formatContactTableDate(contact.lastBookingDate)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="hidden lg:block">
            <Table
              aria-label="Contacts"
              selectionMode="multiple"
              selectedKeys={selectedKeys}
              onSelectionChange={onSelectedKeysChange}
              sortDescriptor={sortDescriptor}
              onSortChange={(next) => {
                const column =
                  next.column === 'bookings' ? 'bookings' : 'lastBooking'
                onSortChange({
                  column,
                  direction: next.direction ?? 'descending',
                })
              }}
            >
              <Table.Header>
                <Table.Head id="name" isRowHeader>
                  Name
                </Table.Head>
                <Table.Head id="bookings" allowsSorting>
                  Total Bookings
                </Table.Head>
                <Table.Head id="lastBooking" allowsSorting>
                  Last Booking
                </Table.Head>
                <Table.Head id="actions" className="w-16">
                  <span className="sr-only">Actions</span>
                </Table.Head>
              </Table.Header>
              <Table.Body items={visible}>
                {(contact) => (
                  <Table.Row
                    id={contact.id}
                    onAction={() => onSelectContact(contact.id)}
                  >
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="md"
                          initials={contactInitials(contact.name)}
                          alt={contact.name}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-primary">
                            {contact.name}
                          </p>
                          <p className="truncate text-sm text-tertiary">
                            {contact.email}
                          </p>
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell>{contact.bookingCount}</Table.Cell>
                    <Table.Cell>
                      {formatContactTableDate(contact.lastBookingDate)}
                    </Table.Cell>
                    <Table.Cell>
                      <div
                        onClick={(event) => event.stopPropagation()}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <Dropdown.Root>
                          <Dropdown.DotsButton
                            aria-label={`Actions for ${contact.name}`}
                          />
                          <Dropdown.Popover className="w-min">
                            <Dropdown.Menu>
                              <Dropdown.Item
                                icon={Eye}
                                onAction={() => onSelectContact(contact.id)}
                              >
                                View details
                              </Dropdown.Item>
                              <Dropdown.Item
                                icon={Download01}
                                onAction={() => handleExport([contact])}
                              >
                                Export CSV
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown.Root>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>
            </div>

            <PaginationCardMinimal
              page={safePage}
              total={totalPages}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        )}
      </TableCard.Root>

      <BottomSheet
        open={selectedContactId != null}
        title={contactDetail?.name ?? 'Contact'}
        onClose={onCloseDetail}
      >
        {contactDetailLoading || !contactDetail ? (
          <p className="text-sm text-tertiary">Loading contact…</p>
        ) : (
          <ContactDetailPanel
            contact={contactDetail}
            embedded
            tenantId={tenantId}
            bowlersPerLane={bowlersPerLane}
            canRefund
          />
        )}
      </BottomSheet>
    </>
  )
}
