'use client'

import { useMemo, useState } from 'react'
import type { SortDescriptor } from 'react-aria-components'
import { Download01, SearchLg, Users01 } from '@untitledui/icons'

import { EmptyState } from '@/components/application/empty-state/empty-state'
import { PaginationCardMinimal } from '@/components/application/pagination/pagination'
import { Table, TableCard } from '@/components/application/table/table'
import { ContactDetailPanel } from '@/app/(staff)/staff/reports/contacts/[contactId]/contact-detail-panel'
import { Avatar } from '@/components/base/avatar/avatar'
import { Button } from '@/components/base/buttons/button'
import { Dropdown } from '@/components/base/dropdown/dropdown'
import { Input } from '@/components/base/input/input'
import { NativeSelect } from '@/components/base/select/select-native'
import { BottomSheet } from '@/components/chrome/bottom-sheet'
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
  type StaffContactsSortColumn,
} from '@/lib/reports-display'

export type ReportsContactsViewProps = {
  contacts: StaffContactRow[]
  query: string
  onQueryChange: (value: string) => void
  /** @deprecated Kept for call-site compatibility; search is in the page header. */
  searchExpanded?: boolean
  /** @deprecated */
  onSearchExpandedChange?: (expanded: boolean) => void
  /** Omit in-view search/export when the page header owns them. */
  headerSearch?: boolean
  selectedContactId: string | null
  onSelectContact: (contactId: string) => void
  onCloseDetail: () => void
  contactDetail: StaffContactDetail | null
  contactDetailLoading: boolean
  tenantId: string
  bowlersPerLane?: number
}

const PAGE_SIZES = [10, 25, 50, 100] as const

function sortFromDescriptor(descriptor: SortDescriptor): StaffContactsSort {
  const column: StaffContactsSortColumn =
    descriptor.column === 'bookings' ? 'bookings' : 'lastBooking'
  return {
    column,
    direction: descriptor.direction === 'ascending' ? 'ascending' : 'descending',
  }
}

export function ReportsContactsView({
  contacts,
  query,
  onQueryChange,
  headerSearch = false,
  selectedContactId,
  onSelectContact,
  onCloseDetail,
  contactDetail,
  contactDetailLoading,
  tenantId,
  bowlersPerLane,
}: ReportsContactsViewProps) {
  const packageOptions = useMemo(
    () => uniqueContactPackages(contacts),
    [contacts],
  )
  const [packageFilter, setPackageFilter] = useState('')
  const [sort, setSort] = useState<StaffContactsSort>({
    column: 'lastBooking',
    direction: 'descending',
  })
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10)
  const filterKey = `${query}::${packageFilter}::${pageSize}`
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 })
  const page = pageState.key === filterKey ? pageState.page : 1
  const setPage = (next: number) => setPageState({ key: filterKey, page: next })
  const [selectedKeys, setSelectedKeys] = useState<'all' | Set<string>>(
    new Set(),
  )

  const filtered = useMemo(() => {
    const byQuery = filterContacts(contacts, query)
    return filterContactsByPackage(byQuery, packageFilter)
  }, [contacts, query, packageFilter])

  const sorted = useMemo(() => sortContacts(filtered, sort), [filtered, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => paginateContacts(sorted, safePage, pageSize),
    [sorted, safePage, pageSize],
  )

  const selectedRows = useMemo(() => {
    if (selectedKeys === 'all') return filtered
    if (selectedKeys.size === 0) return filtered
    return filtered.filter((c) => selectedKeys.has(c.id))
  }, [filtered, selectedKeys])

  function handleExport(rows: StaffContactRow[]) {
    downloadCsv('contacts.csv', exportContactsCsv(rows))
  }

  function emptyMessage() {
    if (query.trim()) return `No contacts match "${query.trim()}"`
    if (packageFilter) return `No contacts for ${packageFilter}`
    return 'No contacts yet.'
  }

  const sortDescriptor: SortDescriptor = {
    column: sort.column,
    direction: sort.direction,
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {!headerSearch ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              aria-label="Search contacts"
              placeholder="Search"
              icon={SearchLg}
              value={query}
              onChange={onQueryChange}
              size="sm"
              className="sm:max-w-xs"
            />
            <Button
              type="button"
              color="secondary"
              size="sm"
              iconLeading={Download01}
              onClick={() => handleExport(selectedRows)}
            >
              Export Contacts CSV
            </Button>
          </div>
        ) : null}

        <TableCard.Root>
          <TableCard.Header
            title="Contacts"
            badge={filtered.length}
            contentTrailing={
              packageOptions.length > 0 ? (
                <NativeSelect
                  aria-label="Filter by package"
                  size="sm"
                  value={packageFilter}
                  onChange={(e) => {
                    setPackageFilter(e.target.value)
                    setPage(1)
                  }}
                  options={[
                    { label: 'All packages', value: '' },
                    ...packageOptions.map((name) => ({
                      label: name,
                      value: name,
                    })),
                  ]}
                  className="w-44"
                />
              ) : undefined
            }
          />

          {filtered.length === 0 ? (
            <EmptyState size="md" className="py-12">
              <EmptyState.Header>
                <EmptyState.FeaturedIcon
                  icon={Users01}
                  color="gray"
                  theme="modern"
                />
              </EmptyState.Header>
              <EmptyState.Content>
                <EmptyState.Title>{emptyMessage()}</EmptyState.Title>
                <EmptyState.Description>
                  Contacts appear here after customers book online or walk in.
                </EmptyState.Description>
              </EmptyState.Content>
            </EmptyState>
          ) : (
            <>
              <div className="hidden lg:block">
                <Table
                  aria-label="Contacts"
                  size="sm"
                  selectionMode="multiple"
                  selectedKeys={selectedKeys}
                  onSelectionChange={(keys) => {
                    if (keys === 'all') {
                      setSelectedKeys('all')
                      return
                    }
                    setSelectedKeys(new Set([...keys].map(String)))
                  }}
                  sortDescriptor={sortDescriptor}
                  onSortChange={(next) => {
                    setSort(sortFromDescriptor(next))
                    setPage(1)
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
                  <Table.Body items={pageRows}>
                    {(contact) => (
                      <Table.Row
                        id={contact.id}
                        onAction={() => onSelectContact(contact.id)}
                      >
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              size="sm"
                              initials={contactInitials(contact.name)}
                              alt={contact.name}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-primary">
                                {contact.name}
                              </p>
                              <p className="truncate text-xs text-tertiary">
                                {contact.email}
                              </p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="text-primary">
                            {contact.bookingCount}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          {formatContactTableDate(contact.lastBookingDate)}
                        </Table.Cell>
                        <Table.Cell>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <Dropdown.Root>
                              <Dropdown.DotsButton
                                aria-label={`Actions for ${contact.name}`}
                              />
                              <Dropdown.Popover className="w-48">
                                <Dropdown.Menu
                                  onAction={(key) => {
                                    if (key === 'view') {
                                      onSelectContact(contact.id)
                                    } else if (key === 'export') {
                                      handleExport([contact])
                                    }
                                  }}
                                >
                                  <Dropdown.Item id="view">
                                    <span className="pr-4">View details</span>
                                  </Dropdown.Item>
                                  <Dropdown.Item id="export">
                                    <span className="pr-4">Export CSV</span>
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

              <ul className="flex flex-col divide-y divide-secondary lg:hidden">
                {pageRows.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => onSelectContact(contact.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary_hover"
                    >
                      <Avatar
                        size="md"
                        initials={contactInitials(contact.name)}
                        alt={contact.name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-primary">
                          {contact.name}
                        </p>
                        <p className="truncate text-xs text-tertiary">
                          {contact.email}
                        </p>
                        <p className="mt-1 text-xs text-tertiary">
                          {contact.bookingCount} booking
                          {contact.bookingCount === 1 ? '' : 's'} ·{' '}
                          {formatContactTableDate(contact.lastBookingDate)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <PaginationCardMinimal
                align="center"
                page={safePage}
                total={pageCount}
                pageSize={pageSize}
                onPageChange={(next) =>
                  setPage(Math.min(Math.max(1, next), pageCount))
                }
                onPageSizeChange={(next) => {
                  if ((PAGE_SIZES as readonly number[]).includes(next)) {
                    setPageSize(next as (typeof PAGE_SIZES)[number])
                    setPage(1)
                  }
                }}
              />
            </>
          )}
        </TableCard.Root>
      </div>

      <BottomSheet
        open={selectedContactId != null}
        title={contactDetail?.name ?? 'Contact'}
        onClose={onCloseDetail}
        placement="end"
      >
        {contactDetailLoading || !contactDetail ? (
          <p className="p-4 text-sm text-tertiary">Loading contact…</p>
        ) : (
          <div className="p-4">
            <ContactDetailPanel
              key={contactDetail.id}
              contact={contactDetail}
              embedded
              tenantId={tenantId}
              bowlersPerLane={bowlersPerLane}
              canRefund
            />
          </div>
        )}
      </BottomSheet>
    </>
  )
}

/** Header actions for the Contacts rail page (Search + Export). */
export function ReportsContactsHeaderActions({
  query,
  onQueryChange,
  onExport,
}: {
  query: string
  onQueryChange: (value: string) => void
  onExport: () => void
}) {
  return (
    <>
      <Input
        aria-label="Search contacts"
        placeholder="Search"
        icon={SearchLg}
        value={query}
        onChange={onQueryChange}
        size="sm"
        className="w-full sm:w-56"
      />
      <Button
        type="button"
        color="primary"
        size="sm"
        iconLeading={Download01}
        onClick={onExport}
      >
        Export Contacts CSV
      </Button>
    </>
  )
}
