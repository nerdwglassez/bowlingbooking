// /staff/bookings/[id] — booking detail page.
//
// Server Component. Looks up the booking via getBookingDetail (staff-gated).
// Renders detail card + a RefundPanel client component that's only included
// when the current user is MANAGER or ADMIN (refundBookingAction enforces
// the same check on its side; this is just UI gating, not the real guard).

import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { getBookingDetail } from '@/lib/actions/staff'
import { formatPrice } from '@/lib/pricing'

import { RefundPanel } from './refund-panel'

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

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function StaffBookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const booking = await getBookingDetail(id)
  if (!booking) notFound()

  const user = await getCurrentUser()
  const canRefund = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  return (
    <>
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          Booking · {booking.confirmationCode}
        </span>
        <h1 className="text-2xl">{booking.customerName}</h1>
      </header>

      <Card>
        <CardBody className="flex flex-col gap-3 text-sm">
          <DetailRow label="When">
            <span className="text-[var(--color-text-primary)]">
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
            <Badge variant={booking.source === 'WALK_IN' ? 'info' : 'default'}>
              {booking.source}
            </Badge>
          </DetailRow>
          <DetailRow label="Status">
            <Badge
              variant={
                booking.status === 'CONFIRMED'
                  ? 'ok'
                  : booking.status === 'CANCELLED'
                    ? 'error'
                    : booking.status === 'NO_SHOW'
                      ? 'warning'
                      : 'default'
              }
            >
              {booking.isRefunded ? 'REFUNDED' : booking.status}
            </Badge>
          </DetailRow>
          {booking.notes ? (
            <DetailRow label="Notes">{booking.notes}</DetailRow>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3 text-sm">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            Customer
          </h2>
          <DetailRow label="Email">{booking.customerEmail}</DetailRow>
          {booking.customerPhone ? (
            <DetailRow label="Phone">{booking.customerPhone}</DetailRow>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-3 text-sm">
          <h2 className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            Payment
          </h2>
          <DetailRow label="Total">
            <span className="text-[var(--color-text-primary)]">
              {formatPrice(booking.totalAmount)}
            </span>
          </DetailRow>
          {booking.payment ? (
            <>
              <DetailRow label="Status">{booking.payment.status}</DetailRow>
              {booking.payment.stripePaymentIntentId ? (
                <DetailRow label="Stripe intent">
                  <code className="text-xs">
                    {booking.payment.stripePaymentIntentId}
                  </code>
                </DetailRow>
              ) : (
                <DetailRow label="Stripe">
                  <span className="text-[var(--color-text-secondary)]">
                    Walk-in / not via Stripe
                  </span>
                </DetailRow>
              )}
              {booking.payment.refundStatus !== 'NONE' ? (
                <DetailRow label="Refund">
                  <Badge
                    variant={
                      booking.payment.refundStatus === 'SUCCEEDED'
                        ? 'ok'
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
            <p className="text-[var(--color-text-secondary)]">
              No payment recorded (comp).
            </p>
          )}
        </CardBody>
      </Card>

      {canRefund &&
      booking.payment &&
      booking.payment.refundStatus !== 'PENDING' &&
      booking.payment.amount - (booking.payment.refundAmount ?? 0) > 0 ? (
        <RefundPanel
          key={`${booking.id}:${booking.payment.amount - (booking.payment.refundAmount ?? 0)}`}
          bookingId={booking.id}
          amountCents={
            booking.payment.amount -
            (booking.payment.refundAmount ?? 0)
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
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
