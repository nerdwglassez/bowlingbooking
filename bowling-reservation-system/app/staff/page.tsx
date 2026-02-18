'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { CalendarDays, CircleDollarSign, Clock3, LayoutGrid, MoreVertical, Plus, Search } from 'lucide-react'
import Select from '@/components/ui/Select'
import { formatTime12Hour } from '@/lib/time'
import { getBookingLanes } from '@/lib/staff-booking-utils'

interface Booking {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  numBowlers: number
  status: string
  totalPrice?: number
  lanes?: string | null
  user: {
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  bookingPackages?: Array<{
    package?: {
      name?: string | null
    } | null
  }>
}

export default function StaffDashboardPage() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'checked' | 'completed'>('all')
  const [openActionsForId, setOpenActionsForId] = useState<string | null>(null)
  const [openActionsUpwardForId, setOpenActionsUpwardForId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    bookingsToday: 0,
    availableLanes: 0,
    checkingInSoon: 0,
    revenueToday: 0,
  })

  useEffect(() => {
    loadTodayBookings()
  }, [])

  useEffect(() => {
    const handleBookingUpdated = () => {
      loadTodayBookings()
    }
    window.addEventListener('staff:booking-updated', handleBookingUpdated)
    return () => window.removeEventListener('staff:booking-updated', handleBookingUpdated)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('[data-actions-menu-root="true"]')) {
        setOpenActionsForId(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenActionsForId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const loadTodayBookings = async () => {
    try {
      const response = await fetch('/api/staff/bookings/today')
      if (!response.ok) throw new Error('Failed to load bookings')
      const data = await response.json()
      setTodayBookings(data.bookings || [])

      // Calculate stats
      const now = new Date()
      const paidOrConfirmed = data.bookings.filter((b: Booking) => b.status === 'CONFIRMED' || b.status === 'PAID')
      const checkingInSoon = paidOrConfirmed.filter((b: Booking) => {
        const bookingTime = new Date(`${b.date}T${b.startTime}`)
        const minsAway = (bookingTime.getTime() - now.getTime()) / (1000 * 60)
        return minsAway >= 0 && minsAway <= 60
      }).length
      const occupiedNow = data.bookings.filter((b: Booking) => b.status === 'CHECKED_IN').length
      const TOTAL_LANES_ASSUMED = 20
      const stats = {
        bookingsToday: data.bookings.length,
        availableLanes: Math.max(0, TOTAL_LANES_ASSUMED - occupiedNow),
        checkingInSoon,
        revenueToday: data.bookings
          .filter((b: Booking) => b.status !== 'CANCELLED')
          .reduce((sum: number, b: Booking) => sum + (Number(b.totalPrice) || 0), 0),
      }
      setStats(stats)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase()
    return todayBookings.filter((b) => {
      const customerName = [b.user.firstName, b.user.lastName].filter(Boolean).join(' ').trim()
      const matchesQuery =
        !q ||
        customerName.toLowerCase().includes(q) ||
        b.user.email.toLowerCase().includes(q) ||
        b.startTime.toLowerCase().includes(q) ||
        formatTime12Hour(b.startTime).toLowerCase().includes(q) ||
        String(b.lane).includes(q)

      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'upcoming' && (b.status === 'CONFIRMED' || b.status === 'PENDING')) ||
        (statusFilter === 'checked' && b.status === 'CHECKED_IN') ||
        (statusFilter === 'completed' && b.status === 'PAID')

      return matchesQuery && matchesFilter
    })
  }, [todayBookings, query, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return 'border border-indigo-200 bg-indigo-100 text-indigo-700'
      case 'PAID':
        return 'border border-slate-300 bg-slate-100 text-slate-700'
      case 'CONFIRMED':
      case 'PENDING':
        return 'border border-violet-200 bg-violet-100 text-violet-700'
      default:
        return 'border border-slate-200 bg-slate-100 text-slate-700'
    }
  }

  const getStatusDisplayLabel = (status: string) => {
    if (status === 'CHECKED_IN') return 'Checked In'
    if (status === 'PAID') return 'Completed'
    if (status === 'CONFIRMED' || status === 'PENDING') return 'Upcoming'
    return status.replace('_', ' ')
  }

  const canEditReservation = (status: string) =>
    status === 'PENDING' || status === 'PAID' || status === 'CONFIRMED'

  const getCustomerDisplayName = (booking: Booking) => {
    const fullName = [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim()
    return fullName || booking.user.email || 'Guest'
  }

  const getSecondaryBookingDetail = (booking: Booking) => {
    const primaryPackageName =
      booking.bookingPackages?.find((bp) => Boolean(bp.package?.name))?.package?.name?.trim() || ''
    const bowlersLabel = `${booking.numBowlers} bowler${booking.numBowlers > 1 ? 's' : ''}`
    return primaryPackageName ? `${bowlersLabel} · ${primaryPackageName}` : bowlersLabel
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="space-y-6 px-4 py-0 sm:px-0">
      <section className="relative -mt-6 left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-gradient-to-r from-indigo-500 to-blue-500 px-6 pb-8 pt-6 text-white sm:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Bookings today', value: stats.bookingsToday, accent: 'text-white', icon: CalendarDays },
              { label: 'Available lanes', value: stats.availableLanes, accent: 'text-white', icon: LayoutGrid },
              { label: 'Checking in soon', value: stats.checkingInSoon, accent: 'text-white', icon: Clock3 },
              { label: 'Revenue today', value: `$${stats.revenueToday.toFixed(0)}`, accent: 'text-white', icon: CircleDollarSign },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/20 bg-white/15 px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/20">
                  <card.icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-xs font-medium tracking-wide text-indigo-100">{card.label}</p>
                <p className={`mt-1 text-3xl font-bold leading-[1.2] ${card.accent}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/staff/bookings/create"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-indigo-700 shadow-[0_8px_20px_rgba(15,23,42,0.2)] hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              New booking
            </Link>
            <Link
              href="/staff/reports"
              className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Reporting
            </Link>
            <Link
              href="/staff/calendar"
              className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Calendar
            </Link>
          </div>
        </div>
      </section>

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Today&apos;s schedule</h2>
            <p className="text-sm text-slate-500">{format(new Date(), 'EEE, MMM d')}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <div className="w-full sm:w-auto sm:min-w-[180px]">
              <Select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="min-h-[42px] border-slate-300 bg-white py-2 text-slate-700"
              >
                <option value="all">All statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="checked">Checked in</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by customer name, time, or lane"
                className="w-full rounded-xl border-2 border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-slate-500">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-slate-300/80 text-slate-400">
              <Search className="h-5 w-5" />
            </span>
            <p>No reservations found matching your search.</p>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[180px_1fr_190px_220px_170px] bg-gradient-to-r from-slate-50 to-slate-100/60 px-6 py-4 text-sm font-semibold text-slate-500 md:grid">
              <span>Time</span>
              <span>Customer</span>
              <span>Lanes</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <div>
              {filteredBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className={`border-b border-slate-200/60 px-6 py-5 ${
                    index % 2 === 0 ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_190px_220px_170px] md:items-center">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Clock3 className="h-4 w-4 text-slate-500" />
                      {formatTime12Hour(booking.startTime)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{getCustomerDisplayName(booking)}</p>
                      <p className="text-sm text-slate-500">
                        {getSecondaryBookingDetail(booking)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getBookingLanes(booking).map((lane) => (
                        <span
                          key={`${booking.id}-${lane}`}
                          className="inline-flex rounded-[10px] bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600"
                        >
                          {lane}
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                        {getStatusDisplayLabel(booking.status)}
                      </span>
                    </div>
                    <div className="flex justify-start">
                      <div className="relative" data-actions-menu-root="true">
                        <button
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={openActionsForId === booking.id}
                          aria-label={`Open actions for booking at ${formatTime12Hour(booking.startTime)}`}
                          onClick={(event) => {
                            const target = event.currentTarget as HTMLButtonElement | null
                            const rect = target?.getBoundingClientRect()
                            const MENU_ESTIMATED_HEIGHT = 170
                            const shouldOpenUpward =
                              rect != null ? window.innerHeight - rect.bottom < MENU_ESTIMATED_HEIGHT : false

                            setOpenActionsForId((current) => {
                              if (current === booking.id) {
                                setOpenActionsUpwardForId(null)
                                return null
                              }
                              setOpenActionsUpwardForId(shouldOpenUpward ? booking.id : null)
                              return booking.id
                            })
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openActionsForId === booking.id ? (
                          <div
                            role="menu"
                            className={`absolute left-0 z-20 min-w-[150px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ${
                              openActionsUpwardForId === booking.id ? 'bottom-11' : 'top-11'
                            }`}
                          >
                            <Link
                              href={`/staff/bookings/${booking.id}`}
                              role="menuitem"
                              onClick={() => setOpenActionsForId(null)}
                              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Details
                            </Link>
                            {canEditReservation(booking.status) && (
                              <Link
                                href={`/staff/bookings/${booking.id}/edit`}
                                role="menuitem"
                                onClick={() => setOpenActionsForId(null)}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Edit Reservation
                              </Link>
                            )}
                            {(booking.status === 'CONFIRMED' || booking.status === 'PAID') && (
                              <Link
                                href={`/staff/check-in?bookingId=${booking.id}`}
                                role="menuitem"
                                onClick={() => setOpenActionsForId(null)}
                                className="block rounded-lg px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                              >
                                Check In
                              </Link>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


