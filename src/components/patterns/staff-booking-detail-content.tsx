'use client'

import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { StaffPaymentResumeButton } from '@/components/chrome/staff-payment-resume-button'
import type { StaffBookingDetail } from '@/lib/actions/staff'
import { formatPrice } from '@/lib/pricing'

import { StaffBookingOpsPanel } from '@/app/(staff)/staff/bookings/[id]/staff-booking-ops-panel'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

function statusColor(
  status: StaffBookingDetail['status'],
): 'gray' | 'success' | 'error' | 'warning' {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'CANCELLED') return 'error'
  if (status === 'NO_SHOW') return 'warning'
  return 'gray'
}

export function StaffBookingDetailContent({
  booking,
  canRefund,
  onModify,
  compact,
}: {
  booking: StaffBookingDetail
  canRefund: boolean
  onModify?: () => void
  compact?: boolean
}) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-tertiary">
          {booking.confirmationCode}
        </span>
        <h2 className="text-lg font-semibold text-primary">
          {booking.customerName}
        </h2>
        <p className="text-sm text-tertiary">
          {DATE_FORMATTER.format(booking.startTime)} ·{' '}
          {TIME_FORMATTER.format(booking.startTime)} –{' '}
          {TIME_FORMATTER.format(booking.endTime)}
        </p>
      </div>

      <DetailRow label="Bowlers">
        {booking.bowlerCount} on {booking.laneCount} lane
        {booking.laneCount === 1 ? '' : 's'}
      </DetailRow>
      <DetailRow label="Package">{booking.packageName}</DetailRow>
      <DetailRow label="Status">
        <Badge size="sm" color={statusColor(booking.status)} type="pill-color">
          {booking.isRefunded ? 'Refunded' : booking.status}
        </Badge>
      </DetailRow>

      {booking.customerEmail ? (
        <DetailRow label="Email">
          <a
            href={`mailto:${booking.customerEmail}`}
            className="text-brand-secondary"
          >
            {booking.customerEmail}
          </a>
        </DetailRow>
      ) : null}
      {booking.customerPhone ? (
        <DetailRow label="Phone">
          <a href={`tel:${booking.customerPhone}`} className="text-brand-secondary">
            {booking.customerPhone}
          </a>
        </DetailRow>
      ) : null}

      <DetailRow label="Total">{formatPrice(booking.totalAmount)}</DetailRow>

      {booking.payment?.stripePaymentIntentId &&
      booking.payment.status !== 'succeeded' ? (
        <StaffPaymentResumeButton
          paymentIntentId={booking.payment.stripePaymentIntentId}
        />
      ) : null}

      <StaffBookingOpsPanel
        bookingId={booking.id}
        status={booking.status}
        checkedInAt={booking.checkedInAt}
      />

      {onModify && booking.status !== 'CANCELLED' ? (
        <Button type="button" color="secondary" onClick={onModify}>
          Modify booking
        </Button>
      ) : null}

      {!compact && canRefund ? (
        <Button href={`/staff/bookings/${booking.id}`} color="tertiary" size="sm">
          Open full detail (refunds)
        </Button>
      ) : null}
    </div>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-secondary py-2 last:border-0">
      <span className="text-tertiary">{label}</span>
      <span className="text-right text-primary">{children}</span>
    </div>
  )
}
