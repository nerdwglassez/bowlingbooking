'use client'

import { ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
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

function statusVariant(
  status: StaffContactHistoryStatus,
): 'ok' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'upcoming':
      return 'info'
    case 'checked_in':
      return 'warning'
    case 'cancelled':
      return 'error'
    default:
      return 'ok'
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
      <div className="pb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
        Booking history
      </div>
      {items.map((item) => (
        <button
          key={item.bookingId}
          type="button"
          onClick={() => onSelectBooking(item.bookingId)}
          className="flex w-full items-start gap-2 border-b border-solid border-[var(--color-border)] py-2.5 text-left last:border-0"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                {formatHistoryDate(item.startTime)}
              </span>
              <span className="font-[family-name:var(--font-display)] text-sm text-[var(--color-action-dark)]">
                {formatMetricMoney(item.amountCents)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-[var(--radius-full)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                {item.bowlerCount} bowlers
              </span>
              <span className="rounded-[var(--radius-full)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                {item.packageName}
              </span>
              <span className="rounded-[var(--radius-full)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                {item.laneLabel}
              </span>
              <Badge variant={statusVariant(item.status)} className="text-[9px]">
                {statusLabel(item.status)}
              </Badge>
            </div>
          </div>
          <ChevronRight
            className="mt-0.5 size-3.5 shrink-0 text-[var(--color-text-muted)]"
            aria-hidden
          />
        </button>
      ))}
      {hiddenCount > 0 ? (
        <p className="py-2.5 text-center text-[11px] text-[var(--color-text-muted)]">
          {hiddenCount} more booking{hiddenCount === 1 ? '' : 's'}
        </p>
      ) : null}
    </>
  )
}
