// /find-my-booking/[code] — booking detail + cancel affordance.
//
// Anonymous-friendly. Re-authenticates on every request via the email
// query string + the path's confirmation code. If the lookup fails, we
// redirect back to /find-my-booking with a generic error.

import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { getBookingByLookup } from '@/lib/actions/customer'
import { formatPrice } from '@/lib/pricing'
import { getTenant } from '@/lib/tenant'

import { CancelPanel } from './cancel-panel'

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

type PageProps = {
  params: Promise<{ code: string }>
  searchParams: Promise<{ email?: string; cancelled?: string }>
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { code } = await params
  const { email, cancelled } = await searchParams
  if (!email) {
    redirect('/find-my-booking?error=notfound')
  }
  const tenant = await getTenant()
  const booking = await getBookingByLookup({
    email,
    confirmationCode: code,
  })
  if (!booking) {
    redirect('/find-my-booking?error=notfound')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[600px] flex-col gap-6 px-4 py-8 lg:px-8 lg:py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/find-my-booking"
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Look up a different booking
        </Link>
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
          {tenant.name} · {booking.confirmationCode}
        </span>
        <h1 className="text-2xl">{booking.customerName}</h1>
      </header>

      {cancelled === '1' ? (
        <Card>
          <CardBody className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--status-ok-text)]">
              Booking cancelled.
            </span>
            <span className="text-[var(--color-text-secondary)]">
              We&apos;ve emailed you a confirmation. If a refund was issued, it
              typically takes 3–5 business days to appear.
            </span>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-3 text-sm">
          <Row label="When">
            {DATETIME_FORMATTER.format(booking.startTime)} –{' '}
            {DATETIME_FORMATTER.format(booking.endTime).split(',').pop()?.trim()}
          </Row>
          <Row label="Bowlers">
            {booking.bowlerCount} on {booking.laneCount} lane
            {booking.laneCount === 1 ? '' : 's'}
          </Row>
          <Row label="Package">{booking.packageName}</Row>
          <Row label="Total">{formatPrice(booking.totalAmount)}</Row>
          <Row label="Status">
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
          </Row>
        </CardBody>
      </Card>

      {booking.cancellable ? (
        <CancelPanel
          email={email}
          confirmationCode={booking.confirmationCode}
          refundIfCancelled={booking.refundIfCancelled}
          policyWindowHours={booking.policyWindowHours}
          policyRefundPercent={booking.policyRefundPercent}
        />
      ) : (
        <Card variant="flat">
          <CardBody className="flex flex-col gap-1 text-sm">
            <h2 className="text-base text-[var(--color-text-primary)]">
              {booking.isPast
                ? 'This booking is in the past'
                : booking.status === 'CANCELLED' || booking.isRefunded
                  ? 'This booking is already cancelled'
                  : 'This booking can no longer be cancelled online'}
            </h2>
            <p className="text-[var(--color-text-secondary)]">
              {booking.isPast
                ? 'Past bookings cannot be cancelled.'
                : booking.status === 'CANCELLED' || booking.isRefunded
                  ? 'No further action needed.'
                  : `Cancellations must happen at least ${booking.policyWindowHours}h before the booking. Call ${tenant.phone} for help.`}
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-right text-[var(--color-text-primary)]">
        {children}
      </span>
    </div>
  )
}
