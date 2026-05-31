import Link from 'next/link'
import { redirect } from 'next/navigation'

import { VenueHeader } from '@/components/patterns/venue-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { getDashboardBookings } from '@/lib/actions/dashboard'
import { requireUser } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'
import { formatPrice } from '@/lib/pricing'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

export default async function CustomerDashboardPage() {
  const user = await requireUser()
  if (user.role !== 'CUSTOMER') {
    redirect('/staff')
  }

  const [tenant, bookings] = await Promise.all([
    getTenant(),
    getDashboardBookings(),
  ])

  const now = new Date()
  const upcoming = bookings.filter(
    (b) => b.startTime > now && b.status === 'CONFIRMED',
  )
  const featured = upcoming[0] ?? null
  const rest = upcoming.slice(1)

  const firstName = user.name?.split(/\s+/)[0] ?? 'there'

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-8 pt-6"
      data-theme="light"
    >
      <VenueHeader venueName={tenant.name} address={tenant.address} />

      <header className="flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-display)] text-[26px] text-[var(--color-text-primary)]">
          Hey {firstName}
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          {upcoming.length > 0
            ? `You have ${upcoming.length} upcoming booking${upcoming.length === 1 ? '' : 's'}`
            : 'No upcoming bookings'}
        </p>
      </header>

      {featured ? (
        <Card className="border-0 bg-[var(--surface-dark)]">
          <CardBody className="flex flex-col gap-3 text-[var(--color-text-inverted)]">
            <p className="font-[family-name:var(--font-display)] text-[22px]">
              {DATE_FORMATTER.format(featured.startTime)}
            </p>
            <p className="text-[13px] text-[var(--color-action-dark)]">
              {TIME_FORMATTER.format(featured.startTime)} –{' '}
              {TIME_FORMATTER.format(featured.endTime)}
            </p>
            <p className="text-sm">
              {featured.bowlerCount} bowlers · {featured.packageName} ·{' '}
              {featured.confirmationCode}
            </p>
            {featured.cancellable ? (
              <p className="text-xs text-[var(--color-action-dark)]">
                Free cancellation until{' '}
                {new Date(
                  featured.startTime.getTime() -
                    featured.policyWindowHours * 3_600_000,
                ).toLocaleString()}
              </p>
            ) : null}
            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" asChild>
                <Link
                  href={`/find-my-booking/${featured.confirmationCode}?email=${encodeURIComponent(user.email ?? '')}`}
                >
                  Manage booking
                </Link>
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="text-sm text-[var(--color-text-secondary)]">
            Book a lane or look up a reservation by confirmation code.
          </CardBody>
        </Card>
      )}

      {rest.map((b) => (
        <Card key={b.id}>
          <CardBody className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-[var(--color-text-primary)]">
                {DATE_FORMATTER.format(b.startTime)}
              </span>
              <Badge variant="ok">{b.status}</Badge>
            </div>
            <p className="text-[var(--color-text-secondary)]">
              {b.packageName} · {formatPrice(b.totalAmount)}
            </p>
            <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
              <Link
                href={`/find-my-booking/${b.confirmationCode}?email=${encodeURIComponent(user.email ?? '')}`}
              >
                View details
              </Link>
            </Button>
          </CardBody>
        </Card>
      ))}

      <Button variant="secondary" fullWidth asChild>
        <Link href="/book">Book a lane</Link>
      </Button>
      <Button variant="ghost" fullWidth asChild>
        <Link href="/find-my-booking">Find booking by code</Link>
      </Button>
    </main>
  )
}
