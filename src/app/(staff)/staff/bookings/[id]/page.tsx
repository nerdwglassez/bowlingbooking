import { notFound } from 'next/navigation'

import { Badge } from '@/components/base/badges/badges'
import { StaffPageHeader } from '@/components/chrome/staff-page-header'
import { getCurrentUser } from '@/lib/auth'
import { getBookingDetail } from '@/lib/actions/staff'
import { formatPrice } from '@/lib/pricing'

import { RefundPanel } from './refund-panel'
import { StaffBookingOpsPanel } from './staff-booking-ops-panel'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

const CARD =
  'rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset'

type PageProps = {
  params: Promise<{ id: string }>
}

function statusColor(
  status: string,
): 'gray' | 'success' | 'error' | 'warning' {
  if (status === 'CONFIRMED') return 'success'
  if (status === 'CANCELLED') return 'error'
  if (status === 'NO_SHOW') return 'warning'
  return 'gray'
}

export default async function StaffBookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const booking = await getBookingDetail(id)
  if (!booking) notFound()

  const user = await getCurrentUser()
  const canRefund = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  return (
    <>
      <StaffPageHeader
        title={booking.customerName}
        subtitle={`Booking · ${booking.confirmationCode}`}
      />

      <section className={`${CARD} flex flex-col gap-3 text-sm`}>
        <DetailRow label="When">
          <span className="text-primary">
            {DATE_FORMATTER.format(booking.startTime)} ·{' '}
            {TIME_FORMATTER.format(booking.startTime)} –{' '}
            {TIME_FORMATTER.format(booking.endTime)}
          </span>
        </DetailRow>
        <DetailRow label="Bowlers">
          {booking.bowlerCount} bowler
          {booking.bowlerCount === 1 ? '' : 's'} on {booking.laneCount} lane
          {booking.laneCount === 1 ? '' : 's'}
        </DetailRow>
        <DetailRow label="Package">{booking.packageName}</DetailRow>
        <DetailRow label="Party type">{booking.partyType}</DetailRow>
        <DetailRow label="Source">
          <Badge
            size="sm"
            type="pill-color"
            color={booking.source === 'WALK_IN' ? 'brand' : 'gray'}
          >
            {booking.source}
          </Badge>
        </DetailRow>
        <DetailRow label="Status">
          <Badge
            size="sm"
            type="pill-color"
            color={statusColor(booking.status)}
          >
            {booking.isRefunded ? 'Refunded' : booking.status}
          </Badge>
        </DetailRow>
        {booking.notes ? (
          <DetailRow label="Notes">{booking.notes}</DetailRow>
        ) : null}
        {booking.shoeSizes.length > 0 ? (
          <DetailRow label="Shoe sizes">
            {booking.shoeSizes.join(', ')}
          </DetailRow>
        ) : null}
      </section>

      <section className={`${CARD} flex flex-col gap-3 text-sm`}>
        <h2 className="text-sm font-semibold text-primary">Staff actions</h2>
        <StaffBookingOpsPanel
          bookingId={booking.id}
          status={booking.status}
          checkedInAt={booking.checkedInAt}
        />
      </section>

      <section className={`${CARD} flex flex-col gap-3 text-sm`}>
        <h2 className="text-sm font-semibold text-primary">Customer</h2>
        <DetailRow label="Email">{booking.customerEmail}</DetailRow>
        {booking.customerPhone ? (
          <DetailRow label="Phone">{booking.customerPhone}</DetailRow>
        ) : null}
      </section>

      <section className={`${CARD} flex flex-col gap-3 text-sm`}>
        <h2 className="text-sm font-semibold text-primary">Payment</h2>
        <DetailRow label="Total">
          <span className="text-primary">{formatPrice(booking.totalAmount)}</span>
        </DetailRow>
        {booking.payment ? (
          <>
            <DetailRow label="Status">{booking.payment.status}</DetailRow>
            {booking.payment.stripePaymentIntentId ? (
              <DetailRow label="Stripe intent">
                <code className="text-xs">{booking.payment.stripePaymentIntentId}</code>
              </DetailRow>
            ) : (
              <DetailRow label="Stripe">
                <span className="text-tertiary">Walk-in / not via Stripe</span>
              </DetailRow>
            )}
            {booking.payment.refundStatus !== 'NONE' ? (
              <DetailRow label="Refund">
                <Badge
                  size="sm"
                  type="pill-color"
                  color={
                    booking.payment.refundStatus === 'SUCCEEDED'
                      ? 'success'
                      : booking.payment.refundStatus === 'FAILED'
                        ? 'error'
                        : 'warning'
                  }
                >
                  {booking.payment.refundStatus}
                </Badge>{' '}
                {booking.payment.refundAmount != null
                  ? formatPrice(booking.payment.refundAmount)
                  : null}
              </DetailRow>
            ) : null}
          </>
        ) : (
          <p className="text-tertiary">No payment recorded (comp).</p>
        )}
      </section>

      {canRefund &&
      booking.payment &&
      booking.payment.refundStatus !== 'PENDING' &&
      booking.payment.amount - (booking.payment.refundAmount ?? 0) > 0 ? (
        <RefundPanel
          key={`${booking.id}:${booking.payment.amount - (booking.payment.refundAmount ?? 0)}`}
          bookingId={booking.id}
          amountCents={
            booking.payment.amount - (booking.payment.refundAmount ?? 0)
          }
          isManual={!booking.payment.stripePaymentIntentId}
        />
      ) : null}
    </>
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
    <div className="flex justify-between gap-3">
      <span className="text-tertiary">{label}</span>
      <span className="text-right text-primary">{children}</span>
    </div>
  )
}
