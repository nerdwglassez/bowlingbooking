'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, subMonths, addMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Search, Users } from 'lucide-react'
import ImmersiveStaffPage from '@/components/layout/ImmersiveStaffPage'
import StaffPageHero from '@/components/staff/StaffPageHero'
import { formatTime12Hour } from '@/lib/time'
import { customerDisplayName } from '@/lib/staff-booking-utils'

interface CalendarBooking {
  id: string
  date: string
  startTime: string
  lane: number
  duration: number
  numBowlers: number
  status: string
  user: { email: string; firstName?: string | null; lastName?: string | null }
  bookingPackages?: Array<{ package?: { name?: string } }>
}

export default function StaffCalendarPage() {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [monthBookings, setMonthBookings] = useState<CalendarBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const loadMonthBookings = async () => {
      setLoading(true)
      try {
        const from = format(startOfMonth(visibleMonth), 'yyyy-MM-dd')
        const to = format(endOfMonth(visibleMonth), 'yyyy-MM-dd')
        const response = await fetch(`/api/staff/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Failed to load calendar bookings')
        const data = await response.json()
        setMonthBookings(data.bookings ?? [])
      } catch (error) {
        console.error(error)
        setMonthBookings([])
      } finally {
        setLoading(false)
      }
    }

    loadMonthBookings()
  }, [visibleMonth])

  const today = new Date()
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`)
  const weekStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 })
  const weekEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 })

  const calendarDays = useMemo(() => {
    const days: Date[] = []
    let current = weekStart
    while (current <= weekEnd) {
      days.push(current)
      current = addDays(current, 1)
    }
    return days
  }, [weekStart, weekEnd])

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>()
    for (const booking of monthBookings) {
      const dateKey = format(new Date(booking.date), 'yyyy-MM-dd')
      const items = map.get(dateKey) ?? []
      items.push(booking)
      map.set(dateKey, items)
    }
    return map
  }, [monthBookings])

  const selectedDayBookings = useMemo(() => {
    const items = bookingsByDate.get(selectedDate) ?? []
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return items
    return items.filter((booking) => {
      const packageName = booking.bookingPackages?.[0]?.package?.name ?? ''
      const laneLabel = `lane ${booking.lane}`
      return (
        booking.user.email.toLowerCase().includes(normalizedQuery) ||
        packageName.toLowerCase().includes(normalizedQuery) ||
        laneLabel.includes(normalizedQuery) ||
        formatTime12Hour(booking.startTime).toLowerCase().includes(normalizedQuery)
      )
    })
  }, [bookingsByDate, selectedDate, query])

  const getBookingStatus = (status: string) => {
    if (status === 'CHECKED_IN') return { label: 'Checked In', classes: 'bg-emerald-100 text-emerald-700' }
    if (status === 'CONFIRMED' || status === 'PAID') return { label: 'Upcoming', classes: 'bg-indigo-100 text-indigo-700' }
    if (status === 'CANCELLED') return { label: 'Cancelled', classes: 'bg-rose-100 text-rose-700' }
    return { label: status.replace('_', ' '), classes: 'bg-slate-100 text-slate-700' }
  }

  return (
    <div>
      <ImmersiveStaffPage />
      <StaffPageHero
        title="Booking Calendar"
        description="View and manage all reservations"
        gradient="calendar"
      />

      <section className="px-4 py-6 sm:px-0">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_340px]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-2xl font-semibold text-slate-900">{format(visibleMonth, 'MMMM yyyy')}</p>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  setVisibleMonth(startOfMonth(now))
                  setSelectedDate(format(now, 'yyyy-MM-dd'))
                }}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Today
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 text-center text-sm font-semibold text-slate-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
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
                    className={`relative h-24 rounded-2xl border text-center transition ${
                      isSelected
                        ? 'border-indigo-500 bg-gradient-to-br from-indigo-500 to-blue-500 text-white'
                        : isCurrentMonth
                          ? 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                          : 'border-slate-100 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span className={`text-lg font-semibold ${isToday && !isSelected ? 'underline decoration-2 underline-offset-4' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {hasBookings && !isSelected ? (
                      <span className="absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-500" />
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
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-2xl font-semibold text-slate-900">{format(selectedDateObj, 'EEEE, MMMM d')}</h2>
            <p className="mt-1 text-sm text-slate-500">{selectedDayBookings.length} booking{selectedDayBookings.length === 1 ? '' : 's'}</p>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search bookings..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            <div className="mt-4 space-y-3">
              {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
              {!loading && selectedDayBookings.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-500">
                    <CalendarDays className="h-7 w-7" />
                  </div>
                  <p>No bookings for this date</p>
                </div>
              ) : null}

              {selectedDayBookings.map((booking) => {
                const status = getBookingStatus(booking.status)
                const packageName = booking.bookingPackages?.[0]?.package?.name ?? 'Standard'
                return (
                  <Link
                    key={booking.id}
                    href={`/staff/bookings/${booking.id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{customerDisplayName(booking.user)}</p>
                        <p className="text-sm text-slate-500">{packageName}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.classes}`}>
                        {status.label}
                      </span>
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
                  </Link>
                )
              })}
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
