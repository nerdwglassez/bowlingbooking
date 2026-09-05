'use client'

// CockpitPanel — Dashboard metrics, occupancy chart, upcoming list.

import { useMemo, useState } from 'react'

import { StaffPageHeader } from '@/components/chrome/staff-page-header'
import { WalkInFab } from '@/components/chrome/walk-in-fab'
import { WalkInSheet } from '@/components/chrome/walk-in-sheet'
import { CockpitContextBar } from '@/components/patterns/cockpit-context-bar'
import { CockpitLaneTimeline } from '@/components/patterns/cockpit-lane-timeline'
import { CockpitLateActions } from '@/components/patterns/cockpit-late-actions'
import { CockpitOccupancyChart } from '@/components/patterns/cockpit-occupancy-chart'
import { CockpitSearchBar } from '@/components/patterns/cockpit-search-bar'
import { CockpitStatHierarchy } from '@/components/patterns/cockpit-stat-hierarchy'
import { CockpitUpcomingList } from '@/components/patterns/cockpit-upcoming-list'
import type { CockpitSnapshot } from '@/lib/actions/staff'
import {
  buildCockpitHourlyBookings,
  buildCockpitTimeline,
  filterCockpitBookings,
  formatCockpitContextDate,
  partitionCockpitBookings,
  type CockpitSubview,
  type CockpitTimeWindow,
} from '@/lib/cockpit-display'
import type { Package } from '@/types'

export type CockpitPanelProps = CockpitSnapshot & {
  venueName: string
  clockLine: string
  tenantId: string
  packages: Package[]
  bowlersPerLane: number
  allowWalkInBookings: boolean
  initialWalkInOpen?: boolean
  onOpenBooking?: (bookingId: string) => void
  subview?: CockpitSubview
}

export function CockpitPanel({
  bookings,
  blocks,
  lanes,
  stats,
  totalLanes,
  referenceNow,
  venueName: _venueName,
  clockLine,
  tenantId,
  packages,
  bowlersPerLane: _bowlersPerLane,
  allowWalkInBookings,
  initialWalkInOpen = false,
  onOpenBooking,
  subview: subviewProp,
}: CockpitPanelProps) {
  const [query, setQuery] = useState('')
  const subview = subviewProp ?? 'overview'
  const [timeWindow, setTimeWindow] = useState<CockpitTimeWindow>(4)
  const [walkInOpen, setWalkInOpen] = useState(initialWalkInOpen)

  const referenceDate = useMemo(
    () => new Date(referenceNow),
    [referenceNow],
  )

  const filtered = useMemo(
    () => filterCockpitBookings(bookings, query),
    [bookings, query],
  )

  const { late, upcoming } = useMemo(
    () => partitionCockpitBookings(filtered, referenceDate),
    [filtered, referenceDate],
  )

  const contextDate = useMemo(
    () => formatCockpitContextDate(referenceDate),
    [referenceDate],
  )

  const timeline = useMemo(
    () =>
      buildCockpitTimeline(
        totalLanes,
        bookings,
        blocks,
        referenceDate,
        timeWindow,
      ),
    [totalLanes, bookings, blocks, referenceDate, timeWindow],
  )

  const hourly = useMemo(
    () => buildCockpitHourlyBookings(bookings, referenceDate),
    [bookings, referenceDate],
  )

  const headerSearch = (
    <CockpitSearchBar
      value={query}
      onChange={setQuery}
      className="max-w-[280px]"
    />
  )

  const mobileSearch = (
    <CockpitSearchBar value={query} onChange={setQuery} />
  )

  return (
    <>
      <div
        className={`flex flex-col gap-6 transition-opacity lg:gap-8 ${
          walkInOpen ? 'pointer-events-none opacity-[0.18]' : ''
        }`}
      >
          <StaffPageHeader
            title={subview === 'lanes' ? 'Lane Assignments' : 'Dashboard'}
            subtitle={clockLine}
            actions={
              subview === 'overview' ? (
                <div className="hidden w-full max-w-[280px] lg:block">
                  {headerSearch}
                </div>
              ) : null
            }
          />

          {subview === 'overview' ? (
            <>
              <CockpitContextBar dateLabel={contextDate} />

              <CockpitOccupancyChart points={hourly} />

              <CockpitStatHierarchy stats={stats} />

              <div className="lg:hidden">{mobileSearch}</div>

              {late.length > 0 ? (
                <>
                  <CockpitUpcomingList
                    bookings={late}
                    referenceNow={referenceNow}
                    title="Late — no check-in (5+ min)"
                    emptyQuery={query.trim() ? query.trim() : null}
                    onOpenBooking={onOpenBooking}
                  />
                  <CockpitLateActions
                    firstLateBookingId={late[0]!.id}
                    onOpenBooking={onOpenBooking}
                  />
                </>
              ) : null}

              <CockpitUpcomingList
                bookings={upcoming}
                referenceNow={referenceNow}
                emptyQuery={query.trim() ? query.trim() : null}
                onOpenBooking={onOpenBooking}
              />
            </>
          ) : (
            <CockpitLaneTimeline
              timeline={timeline}
              totalLanes={totalLanes}
              timeWindow={timeWindow}
              onTimeWindowChange={setTimeWindow}
              onOpenBooking={onOpenBooking}
            />
          )}
      </div>

      {allowWalkInBookings ? (
        <WalkInFab
          hidden={walkInOpen}
          onClick={() => setWalkInOpen(true)}
        />
      ) : null}

      <WalkInSheet
        open={walkInOpen}
        tenantId={tenantId}
        packages={packages}
        lanes={lanes}
        referenceNow={referenceNow}
        onClose={() => setWalkInOpen(false)}
      />
    </>
  )
}
