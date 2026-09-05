'use client'

import { ChevronRight } from '@untitledui/icons'

import { Badge } from '@/components/base/badges/badges'
import {
  formatHistoryDate,
  formatMetricMoney,
  type StaffContactHistoryItem,
  type StaffContactHistoryStatus,
} from '@/lib/reports-display'

export type ContactBookingHistoryProps = {
  items: StaffContactHistoryItem[]
  hiddenCount?: number
  onSelectBooking: (bookingId: string) => void
}

function statusColor(
  status: StaffContactHistoryStatus,
): 'gray' | 'brand' | 'warning' | 'error' | 'success' {
  switch (status) {
    case 'upcoming':
      return 'brand'
    case 'checked_in':
      return 'warning'
    case 'cancelled':
      return 'error'
    default:
      return 'success'
  }
}

function statusLabel(status: StaffContactHistoryStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Upcoming'
    case 'checked_in':
      return 'Checked in'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Completed'
  }
}

export function ContactBookingHistory({
  items,
  hiddenCount = 0,
  onSelectBooking,
}: ContactBookingHistoryProps) {
  return (
    <>
      <div className="pb-1 text-sm font-semibold text-secondary">
        Booking history
      </div>
      {items.map((item) => (
        <button
          key={item.bookingId}
          type="button"
          onClick={() => onSelectBooking(item.bookingId)}
          className="flex w-full items-start gap-2 border-b border-secondary py-3 text-left last:border-0"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-primary">
                {formatHistoryDate(item.startTime)}
              </span>
              <span className="text-sm font-semibold text-brand-secondary">
                {formatMetricMoney(item.amountCents)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge size="sm" color="gray" type="modern">
                {item.bowlerCount} bowlers
              </Badge>
              <Badge size="sm" color="gray" type="modern">
                {item.packageName}
              </Badge>
              <Badge size="sm" color="gray" type="modern">
                {item.laneLabel}
              </Badge>
              <Badge
                size="sm"
                color={statusColor(item.status)}
                type="pill-color"
              >
                {statusLabel(item.status)}
              </Badge>
            </div>
          </div>
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
        </button>
      ))}
      {hiddenCount > 0 ? (
        <p className="py-2.5 text-center text-sm text-tertiary">
          {hiddenCount} more booking{hiddenCount === 1 ? '' : 's'}
        </p>
      ) : null}
    </>
  )
}
