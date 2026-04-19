'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth, subMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Users } from 'lucide-react'
import ImmersiveStaffPage from '@/components/layout/ImmersiveStaffPage'
import StaffPageHero from '@/components/staff/StaffPageHero'
import Button from '@/components/ui/Button'
import { AppLoadingState, AppEmptyState } from '@/components/shared/state/StateBlocks'
import { BookingStatusPill } from '@/components/shared/status/StatusPill'
import {
  ManagementPanel,
  ManagementPanelBody,
} from '@/components/shared/management/ManagementPanel'
import ManagementSearchField from '@/components/shared/management/ManagementSearchField'
import StaffCalendarTimelineView from '@/components/staff/StaffCalendarTimelineView'
import { formatTime12Hour } from '@/lib/time'
import { customerDisplayName } from '@/lib/staff-booking-utils'
import { useStaffCalendarData } from '@/hooks/useStaffCalendarData'
import { useStaffScheduleTimeline } from '@/hooks/useStaffScheduleTimeline'

export default function StaffCalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const openBookingId = searchParams?.get('open') ?? null
  const viewMode = searchParams?.get('view') === 'timeline' ? 'timeline' : 'month'

  const {
    visibleMonth,
    setVisibleMonth,
    selectedDate,
    setSelectedDate,
    loading,
    query,
    setQuery,
    calendarDays,
    bookingsByDate,
    selectedDayBookings,
  } = useStaffCalendarData()

  useEffect(() => {
    if (!openBookingId) return
    router.replace(`/staff/bookings/${encodeURIComponent(openBookingId)}`)
  }, [openBookingId, router])

  const today = new Date()
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`)
  const timelineDate = format(selectedDateObj, 'yyyy-MM-dd')
  const {
    timeline,
    loading: loadingTimeline,
    error: timelineError,
  } = useStaffScheduleTimeline({
    date: timelineDate,
    enabled: viewMode === 'timeline',
  })

  return (
    <div>
      <ImmersiveStaffPage />
      <StaffPageHero
        title="Booking Calendar"
        description="View and manage all reservations"
        gradient="calendar"
      />

      <section className="px-4 py-6 sm:px-0">
        <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[1fr_360px]">
          <ManagementPanel className="overflow-hidden" data-testid="staff-calendar-main-panel">
            <ManagementPanelBody className="p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    rounded="xl"
                    onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
                    className="min-h-[44px] min-w-[44px] border border-slate-200 px-3 text-slate-500 hover:bg-slate-50"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <p className="text-xl font-semibold text-slate-900 sm:text-2xl">
                    {format(visibleMonth, 'MMMM yyyy')}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    rounded="xl"
                    onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                    className="min-h-[44px] min-w-[44px] border border-slate-200 px-3 text-slate-500 hover:bg-slate-50"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  rounded="xl"
                  onClick={() => {
                    const now = new Date()
                    setVisibleMonth(startOfMonth(now))
                    setSelectedDate(format(now, 'yyyy-MM-dd'))
                  }}
                  className="min-h-[44px] bg-indigo-500 px-4 font-semibold hover:bg-indigo-600"
                  data-testid="staff-calendar-today-button"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  rounded="xl"
                  onClick={() => {
                    const nextSearch = new URLSearchParams(searchParams?.toString() ?? '')
                    if (viewMode === 'timeline') {
                      nextSearch.delete('view')
                    } else {
                      nextSearch.set('view', 'timeline')
                    }
                    const queryString = nextSearch.toString()
                    router.replace(
                      queryString ? `/staff/calendar?${queryString}` : '/staff/calendar'
                    )
                  }}
                  className="min-h-[44px] px-4 font-semibold"
                  data-testid="staff-calendar-view-toggle"
                >
                  {viewMode === 'timeline' ? 'Month view' : 'Timeline view'}
                </Button>
              </div>

              {viewMode === 'month' ? (
                <>
                  <div className="mb-2 grid grid-cols-7 text-center text-sm font-semibold text-slate-500">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
                    {calendarDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd')
                      const isCurrentMonth = isSameMonth(day, visibleMonth)
                      const isToday = isSameDay(day, today)
                      const isSelected = isSameDay(day, selectedDateObj)
                      const dayBookings = bookingsByDate.get(dateKey) ?? []
                      const hasBookings = dayBookings.length > 0

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setSelectedDate(dateKey)}
                          className={`relative h-20 min-h-[64px] rounded-2xl border text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:h-24 ${
                            isSelected
                              ? 'border-indigo-500 bg-gradient-to-br from-indigo-500 to-blue-500 text-white'
                              : isCurrentMonth
                                ? 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                                : 'border-slate-100 bg-slate-50 text-slate-400'
                          }`}
                        >
                          <span
                            className={`text-base font-semibold sm:text-lg ${
                              isToday && !isSelected
                                ? 'underline decoration-2 underline-offset-4'
                                : ''
                            }`}
                          >
                            {format(day, 'd')}
                          </span>
                          {hasBookings && !isSelected ? (
                            <span className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-indigo-500" />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded border border-indigo-400 bg-white" />
                      Today
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-indigo-500" />
                      Selected
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-indigo-500/70" />
                      Has Bookings
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-3" data-testid="staff-calendar-timeline">
                  <p className="text-sm text-slate-500">
                    Timeline for {format(selectedDateObj, 'EEEE, MMM d')}
                  </p>
                  {loadingTimeline ? <AppLoadingState className="py-4 text-left" /> : null}
                  {timelineError ? (
                    <AppEmptyState
                      title="Timeline unavailable"
                      message={timelineError}
                      className="rounded-2xl border border-amber-200 bg-amber-50"
                    />
                  ) : null}
                  {!loadingTimeline && !timelineError && timeline ? (
                    <StaffCalendarTimelineView
                      slots={timeline.slots}
                      entries={timeline.entries}
                      conflicts={timeline.conflicts}
                      onBookingOpen={(bookingId) => router.push(`/staff/bookings/${bookingId}`)}
                    />
                  ) : null}
                </div>
              )}
            </ManagementPanelBody>
          </ManagementPanel>

          <ManagementPanel
            className="h-fit xl:sticky xl:top-6"
            data-testid="staff-calendar-sidebar-panel"
          >
            <ManagementPanelBody className="p-5">
              <h2 className="text-2xl font-semibold text-slate-900">
                {format(selectedDateObj, 'EEEE, MMMM d')}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedDayBookings.length} booking{selectedDayBookings.length === 1 ? '' : 's'}
              </p>

              <ManagementSearchField
                className="mt-4 w-full"
                inputClassName="h-11 rounded-xl border border-slate-300 py-3"
                value={query}
                onChange={(value) => setQuery(value)}
                placeholder="Search bookings..."
              />

              <div className="mt-4 space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {loading ? <AppLoadingState className="py-2 text-left" /> : null}
                {!loading && selectedDayBookings.length === 0 ? (
                  <AppEmptyState
                    title="No bookings for this date"
                    icon={<CalendarDays className="h-7 w-7" />}
                    className="rounded-2xl border border-slate-200 bg-slate-50"
                  />
                ) : null}

                {selectedDayBookings.map((booking) => {
                  const packageName = booking.bookingPackages?.[0]?.package?.name ?? 'Standard'
                  return (
                    <Button
                      key={booking.id}
                      type="button"
                      variant="ghost"
                      rounded="xl"
                      onClick={() => router.push(`/staff/bookings/${booking.id}`)}
                      className="h-auto min-h-[84px] w-full justify-start rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left font-normal hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-[0.99] touch-manipulation"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {customerDisplayName(booking.user)}
                          </p>
                          <p className="text-sm text-slate-500">{packageName}</p>
                        </div>
                        <BookingStatusPill status={booking.status} context="staff" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatTime12Hour(booking.startTime)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {booking.numBowlers}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          Lane {booking.lane}
                        </span>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </ManagementPanelBody>
          </ManagementPanel>
        </div>
      </section>
    </div>
  )
}
