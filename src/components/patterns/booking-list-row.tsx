import Link from 'next/link'

import { Badge } from '@/components/base/badges/badges'
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

const STATUS_COLOR: Record<
  BookingListRowStatus,
  'gray' | 'success' | 'warning' | 'error'
> = {
  CONFIRMED: 'success',
  COMPLETED: 'gray',
  NO_SHOW: 'warning',
  CANCELLED: 'error',
  HOLD: 'gray',
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
  const inner = (
    <>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-tertiary">
          {confirmationCode}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-md font-semibold text-primary">
            {TIME_FORMATTER.format(startTime)}
          </span>
          <span className="text-xs text-tertiary">
            – {TIME_FORMATTER.format(endTime)}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium text-primary">{customerName}</span>
        <span className="text-xs text-tertiary">
          {bowlerCount} bowler{bowlerCount === 1 ? '' : 's'} · {laneCount} lane
          {laneCount === 1 ? '' : 's'} · {packageName}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-tertiary">{SOURCE_LABEL[source]}</span>
        <span className="text-sm font-semibold text-primary">
          {formatPrice(totalAmount)}
        </span>
        <Badge size="sm" color={STATUS_COLOR[status]} type="pill-color">
          {isRefunded ? 'Refunded' : status}
        </Badge>
      </div>
    </>
  )

  const className =
    'flex min-h-11 flex-col gap-2 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset lg:flex-row lg:items-center lg:justify-between lg:gap-4'

  if (href) {
    return (
      <Link href={href} className={`${className} hover:bg-primary_hover`}>
        {inner}
      </Link>
    )
  }
  return <div className={className}>{inner}</div>
}
