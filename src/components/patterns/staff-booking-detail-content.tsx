'use client'

import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { StaffBookingDetail } from '@/lib/actions/staff'
import { formatPrice } from '@/lib/pricing'

import { StaffBookingOpsPanel } from '@/app/(staff)/staff/bookings/[id]/staff-booking-ops-panel'
import { StaffPaymentResumeButton } from '@/components/chrome/staff-payment-resume-button'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

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
        <span className="text-xs text-[var(--color-text-secondary)]">
          {booking.confirmationCode}
        </span>
        <h2 className="text-lg [font-family:var(--font-display)] text-[var(--color-text-primary)]">
          {booking.customerName}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)]">
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
        <Badge
          variant={
            booking.status === 'CONFIRMED'
              ? 'ok'
              : booking.status === 'CANCELLED'
                ? 'error'
                : 'default'
          }
        >
          {booking.isRefunded ? 'REFUNDED' : booking.status}
        </Badge>
      </DetailRow>

      {booking.customerEmail ? (
        <DetailRow label="Email">
          <a
            href={`mailto:${booking.customerEmail}`}
            className="text-[var(--color-action)]"
          >
            {booking.customerEmail}
          </a>
        </DetailRow>
      ) : null}
      {booking.customerPhone ? (
        <DetailRow label="Phone">
          <a
            href={`tel:${booking.customerPhone}`}
            className="text-[var(--color-action)]"
          >
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
        <Button type="button" variant="secondary" fullWidth onClick={onModify}>
          Modify booking
        </Button>
      ) : null}

      {!compact && canRefund ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/staff/bookings/${booking.id}`}>
            Open full detail (refunds)
          </Link>
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
    <div className="flex justify-between gap-3 border-b border-solid border-[var(--color-border)] py-2 last:border-0">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-right text-[var(--color-text-primary)]">
        {children}
      </span>
    </div>
  )
}
