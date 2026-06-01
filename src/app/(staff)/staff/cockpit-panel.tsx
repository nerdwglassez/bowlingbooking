'use client'

// CockpitPanel — Overview/Lanes toggle, stats, timeline (staff-app-v2.html).

import { useMemo, useState, useSyncExternalStore } from 'react'

import { WalkInFab } from '@/components/chrome/walk-in-fab'
import { WalkInSheet } from '@/components/chrome/walk-in-sheet'
import { CockpitContextBar } from '@/components/patterns/cockpit-context-bar'
import { CockpitLaneTimeline } from '@/components/patterns/cockpit-lane-timeline'
import { CockpitLateActions } from '@/components/patterns/cockpit-late-actions'
import { CockpitSearchBar } from '@/components/patterns/cockpit-search-bar'
import { CockpitStatHierarchy } from '@/components/patterns/cockpit-stat-hierarchy'
import { CockpitSubviewToggle } from '@/components/patterns/cockpit-subview-toggle'
import { CockpitUpcomingList } from '@/components/patterns/cockpit-upcoming-list'
import type { CockpitSnapshot } from '@/lib/actions/staff'
import {
  COCKPIT_SUBVIEW_STORAGE_KEY,
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
  initialWalkInOpen?: boolean
  onOpenBooking?: (bookingId: string) => void
}

function readPersistedSubview(): CockpitSubview {
  const stored = localStorage.getItem(COCKPIT_SUBVIEW_STORAGE_KEY)
  if (stored === 'overview' || stored === 'lanes') return stored
  return 'overview'
}

function subscribeSubview(onChange: () => void) {
  const handler = () => onChange()
  window.addEventListener(COCKPIT_SUBVIEW_STORAGE_KEY, handler)
  return () => window.removeEventListener(COCKPIT_SUBVIEW_STORAGE_KEY, handler)
}

function usePersistedSubview(): [CockpitSubview, (value: CockpitSubview) => void] {
  const subview = useSyncExternalStore<CockpitSubview>(
    subscribeSubview,
    readPersistedSubview,
    () => 'overview',
  )

  const setSubview = (value: CockpitSubview) => {
    localStorage.setItem(COCKPIT_SUBVIEW_STORAGE_KEY, value)
    window.dispatchEvent(new Event(COCKPIT_SUBVIEW_STORAGE_KEY))
  }

  return [subview, setSubview]
}

export function CockpitPanel({
  bookings,
  blocks,
  lanes,
  stats,
  totalLanes,
  referenceNow,
  venueName,
  clockLine,
  tenantId,
  packages,
  initialWalkInOpen = false,
  onOpenBooking,
}: CockpitPanelProps) {
  const [query, setQuery] = useState('')
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [subview, setSubview] = usePersistedSubview()
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

  return (
    <>
      <div
        className={`flex flex-col gap-6 transition-opacity ${
          walkInOpen ? 'pointer-events-none opacity-[0.18]' : ''
        }`}
      >
          <header className="flex flex-col gap-0.5">
            <h1 className="text-2xl [font-family:var(--font-display)] text-[var(--color-text-primary)]">
              {venueName}
            </h1>
            <p className="text-[10px] text-[var(--color-text-secondary)]">
              {clockLine}
            </p>
          </header>

          <CockpitSubviewToggle value={subview} onChange={setSubview} />

          {subview === 'overview' ? (
            <>
              <CockpitContextBar dateLabel={contextDate} />

              <CockpitStatHierarchy stats={stats} />

              <CockpitSearchBar
                value={query}
                onChange={setQuery}
                expanded={searchExpanded}
                onExpandedChange={setSearchExpanded}
              />

              {late.length > 0 ? (
                <>
                  <h2 className="text-[9px] font-bold uppercase tracking-wider text-[color-mix(in_srgb,var(--status-error-text)_70%,transparent)]">
                    Late — no check-in (5+ min)
                  </h2>
                  <CockpitUpcomingList
                    bookings={late}
                    referenceNow={referenceNow}
                    emptyQuery={query.trim() ? query.trim() : null}
                    onOpenBooking={onOpenBooking}
                  />
                  <CockpitLateActions
                    firstLateBookingId={late[0]!.id}
                    onOpenBooking={onOpenBooking}
                  />
                </>
              ) : null}

              <section className="flex flex-col gap-2">
                <h2 className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                  Upcoming
                </h2>
                <CockpitUpcomingList
                  bookings={upcoming}
                  referenceNow={referenceNow}
                  emptyQuery={query.trim() ? query.trim() : null}
                  onOpenBooking={onOpenBooking}
                />
              </section>
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

      <WalkInFab
        hidden={walkInOpen}
        onClick={() => setWalkInOpen(true)}
      />

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
