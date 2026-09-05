'use client'

import type { ReactNode } from 'react'
import { CalendarDate } from '@untitledui/icons'

import { EmptyState } from '@/components/application/empty-state/empty-state'
import { Table, TableCard } from '@/components/application/table/table'
import { Avatar } from '@/components/base/avatar/avatar'
import { getInitials } from '@/components/base/avatar/utils'
import { Badge } from '@/components/base/badges/badges'
import { cx } from '@/lib/cx'
import type { CockpitBookingRow } from '@/lib/actions/staff'
import {
  formatBookingMeta,
  formatLaneBadge,
  formatLateMeta,
  formatUpcomingTimeParts,
} from '@/lib/cockpit-display'

export type CockpitUpcomingListProps = {
  bookings: CockpitBookingRow[]
  emptyQuery?: string | null
  referenceNow: string
  title?: string
  description?: string
  trailing?: ReactNode
  onOpenBooking?: (bookingId: string) => void
}

const STATUS_COLOR: Record<
  CockpitBookingRow['listStatus'],
  'gray' | 'brand' | 'success' | 'error' | 'warning'
> = {
  pending: 'brand',
  confirmed: 'gray',
  checkedin: 'success',
  payment: 'warning',
  late: 'error',
}

export function CockpitUpcomingList({
  bookings,
  emptyQuery,
  referenceNow,
  title = 'Upcoming',
  description,
  trailing,
  onOpenBooking,
}: CockpitUpcomingListProps) {
  const now = new Date(referenceNow)
  const empty = bookings.length === 0
  const emptyTitle = emptyQuery ? 'No matching bookings' : 'No upcoming bookings'
  const emptyDescription = emptyQuery
    ? `No bookings match “${emptyQuery}”`
    : 'Nothing on the board for the rest of today.'

  return (
    <section className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="flex flex-col gap-0.5">
          <h2
            className={cx(
              'text-md font-semibold',
              title.startsWith('Late') ? 'text-error-primary' : 'text-primary',
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-tertiary">{description}</p>
          ) : null}
        </div>
        {trailing}
        {empty ? (
          <UpcomingEmpty title={emptyTitle} description={emptyDescription} />
        ) : (
          <ul className="flex flex-col">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="border-b border-secondary last:border-b-0"
              >
                <UpcomingRow
                  booking={booking}
                  now={now}
                  onOpenBooking={onOpenBooking}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <TableCard.Root size="sm" className="hidden lg:block">
        <TableCard.Header
          title={title}
          badge={empty ? undefined : bookings.length}
          description={description}
          contentTrailing={trailing}
        />
        {empty ? (
          <UpcomingEmpty title={emptyTitle} description={emptyDescription} />
        ) : (
          <Table aria-label={title} size="sm">
            <Table.Header>
              <Table.Head id="time" isRowHeader>
                Time
              </Table.Head>
              <Table.Head id="guest">Guest</Table.Head>
              <Table.Head id="lane">Lane</Table.Head>
              <Table.Head id="status">Status</Table.Head>
            </Table.Header>
            <Table.Body items={bookings}>
              {(booking) => (
                <Table.Row
                  id={booking.id}
                  onAction={
                    onOpenBooking ? () => onOpenBooking(booking.id) : undefined
                  }
                >
                  <Table.Cell>
                    <UpcomingTime booking={booking} />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        size="sm"
                        initials={getInitials(booking.customerName)}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-primary">
                          {booking.customerName}
                        </p>
                        <p className="text-xs text-tertiary">
                          {booking.listStatus === 'late'
                            ? formatLateMeta(booking, now)
                            : formatBookingMeta(booking)}
                        </p>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{formatLaneBadge(booking.laneNumbers)}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="sm"
                      color={STATUS_COLOR[booking.listStatus]}
                      type="pill-color"
                    >
                      {booking.listStatus}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        )}
      </TableCard.Root>
    </section>
  )
}

function UpcomingEmpty({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <EmptyState size="sm" className="py-8">
      <EmptyState.Header pattern="none">
        <EmptyState.FeaturedIcon
          icon={CalendarDate}
          color="gray"
          theme="modern"
        />
      </EmptyState.Header>
      <EmptyState.Content>
        <EmptyState.Title>{title}</EmptyState.Title>
        <EmptyState.Description>{description}</EmptyState.Description>
      </EmptyState.Content>
    </EmptyState>
  )
}

function UpcomingTime({ booking }: { booking: CockpitBookingRow }) {
  const { hour, ampm } = formatUpcomingTimeParts(booking.startTime)
  const late = booking.listStatus === 'late'

  return (
    <span
      className={cx(
        'text-sm font-semibold',
        late ? 'text-error-primary' : 'text-primary',
      )}
    >
      {hour} {ampm}
    </span>
  )
}

function UpcomingRow({
  booking,
  now,
  onOpenBooking,
}: {
  booking: CockpitBookingRow
  now: Date
  onOpenBooking?: (bookingId: string) => void
}) {
  const late = booking.listStatus === 'late'
  const checkedIn = booking.listStatus === 'checkedin'

  const className = cx(
    'flex w-full min-h-11 items-start gap-3 py-4 text-left',
    late && 'text-error-primary',
    checkedIn && 'opacity-60',
  )

  const body = (
    <>
      <Avatar size="md" initials={getInitials(booking.customerName)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cx(
              'truncate text-sm font-medium',
              late ? 'text-error-primary' : 'text-primary',
            )}
          >
            {booking.customerName}
          </p>
          {late ? (
            <span className="size-2 shrink-0 rounded-full bg-error-solid" />
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-tertiary">
          {late ? formatLateMeta(booking, now) : formatBookingMeta(booking)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <UpcomingTime booking={booking} />
        <Badge size="sm" color="gray" type="modern">
          {formatLaneBadge(booking.laneNumbers)}
        </Badge>
        <Badge
          size="sm"
          color={STATUS_COLOR[booking.listStatus]}
          type="pill-color"
        >
          {booking.listStatus}
        </Badge>
      </div>
    </>
  )

  if (onOpenBooking) {
    return (
      <button
        type="button"
        onClick={() => onOpenBooking(booking.id)}
        className={className}
      >
        {body}
      </button>
    )
  }

  return (
    <a href={`/staff/bookings/${booking.id}`} className={className}>
      {body}
    </a>
  )
}
