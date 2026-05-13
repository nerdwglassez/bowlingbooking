// /staff/schedule — daily timeline + lane blocking.
//
// Server Component. Reads ?date=YYYY-MM-DD from searchParams (defaults to
// today). Renders the timeline of bookings + blocked slots and embeds a
// client island for the blocking form + unblock buttons.

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { ScheduleTimeline } from '@/components/patterns/schedule-timeline'
import { getScheduleForDate } from '@/lib/actions/staff'
import { getTenant } from '@/lib/tenant'

import { BlockingPanel } from './blocking-panel'
import { UnblockButton } from './unblock-button'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
})

type PageProps = {
  searchParams: Promise<{ date?: string }>
}

function isoDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function shiftDay(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export default async function StaffSchedulePage({ searchParams }: PageProps) {
  const params = await searchParams
  const today = new Date()
  const dateISO = params.date ?? isoDate(today)
  const dayDate = new Date(`${dateISO}T00:00:00`)
  const tenant = await getTenant()
  const { bookings, blocks } = await getScheduleForDate(tenant.id, dateISO)

  return (
    <>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl">Schedule</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {DATE_FORMATTER.format(dayDate)} · {bookings.length} booking
            {bookings.length === 1 ? '' : 's'} · {blocks.length} block
            {blocks.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/staff/schedule?date=${shiftDay(dateISO, -1)}`}>
              ← Prev
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/staff/schedule?date=${isoDate(today)}`}>Today</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={`/staff/schedule?date=${shiftDay(dateISO, 1)}`}>
              Next →
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardBody>
          <ScheduleTimeline
            dateISO={dateISO}
            bookings={bookings.map((b) => ({
              id: b.id,
              href: `/staff/bookings/${b.id}`,
              startTime: b.startTime,
              endTime: b.endTime,
              customerName: b.customerName,
              bowlerCount: b.bowlerCount,
              laneCount: b.laneCount,
              source: b.source,
              status: b.status,
              isRefunded: b.isRefunded,
            }))}
            blocks={blocks}
          />
        </CardBody>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">Blocked slots</h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            No blocks for this day.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] p-3 text-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[var(--color-text-primary)]">
                    {b.reason ?? 'Blocked'}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {b.lanes.length === 0
                      ? 'All lanes'
                      : `Lane${b.lanes.length === 1 ? '' : 's'} ${b.lanes.join(', ')}`}{' '}
                    · {b.startTime.toLocaleString()} –{' '}
                    {b.endTime.toLocaleString()}
                  </span>
                </div>
                <UnblockButton blockId={b.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <BlockingPanel dateISO={dateISO} tenantId={tenant.id} />
    </>
  )
}
