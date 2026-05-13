// BookingListRow — single-row summary of a booking in the staff cockpit
// and schedule list.
//
// Server-safe. Controlled — all data via props.

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/pricing'

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

export type BookingListRowStatus =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'HOLD'

export type BookingListRowSource = 'ONLINE' | 'WALK_IN' | 'PHONE'

export interface BookingListRowProps {
  id: string
  href?: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  customerName: string
  bowlerCount: number
  laneCount: number
  packageName: string
  totalAmount: number
  status: BookingListRowStatus
  source: BookingListRowSource
  isRefunded?: boolean
}

const STATUS_VARIANT: Record<
  BookingListRowStatus,
  React.ComponentProps<typeof Badge>['variant']
> = {
  CONFIRMED: 'ok',
  COMPLETED: 'default',
  NO_SHOW: 'warning',
  CANCELLED: 'error',
  HOLD: 'default',
}

const SOURCE_LABEL: Record<BookingListRowSource, string> = {
  ONLINE: 'Online',
  WALK_IN: 'Walk-in',
  PHONE: 'Phone',
}

export function BookingListRow({
  href,
  confirmationCode,
  startTime,
  endTime,
  customerName,
  bowlerCount,
  laneCount,
  packageName,
  totalAmount,
  status,
  source,
  isRefunded,
}: BookingListRowProps) {
  const baseClass =
    'flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-4 text-sm transition-colors md:flex-row md:items-center md:justify-between md:gap-4'

  const inner = (
    <>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          {confirmationCode}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-base [font-family:var(--font-display)] text-[var(--color-text-primary)]">
            {TIME_FORMATTER.format(startTime)}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            – {TIME_FORMATTER.format(endTime)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[var(--color-text-primary)]">{customerName}</span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {bowlerCount} bowler{bowlerCount === 1 ? '' : 's'} · {laneCount} lane
          {laneCount === 1 ? '' : 's'} · {packageName}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-secondary)]">
          {SOURCE_LABEL[source]}
        </span>
        <span className="font-medium text-[var(--color-text-primary)]">
          {formatPrice(totalAmount)}
        </span>
        <Badge variant={STATUS_VARIANT[status]}>
          {isRefunded ? 'REFUNDED' : status}
        </Badge>
        {href ? (
          <span
            aria-hidden
            className="hidden text-[var(--color-text-secondary)] md:inline"
          >
            ›
          </span>
        ) : null}
      </div>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClass} hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)]`}
      >
        {inner}
      </Link>
    )
  }
  return <div className={baseClass}>{inner}</div>
}
