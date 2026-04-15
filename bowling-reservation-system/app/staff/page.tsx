'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarDays, CircleDollarSign, Clock3, LayoutGrid, Plus } from 'lucide-react'
import CreateBookingModal from '@/components/staff/CreateBookingModal'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { BookingStatusPill, getBookingStatusPill } from '@/components/shared/status/StatusPill'
import { EmptySearchBlock, LoadingStateBlock } from '@/components/shared/state/StateBlocks'
import {
  ManagementPanel,
  ManagementPanelHeader,
} from '@/components/shared/management/ManagementPanel'
import {
  ManagementTableRow,
  ManagementTableShell,
} from '@/components/shared/management/ManagementTableShell'
import ManagementSearchField from '@/components/shared/management/ManagementSearchField'
import ManagementRowActionsMenu from '@/components/shared/management/ManagementRowActionsMenu'
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
    id: string
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
  const router = useRouter()
  const [createBookingOpen, setCreateBookingOpen] = useState(false)
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'checked' | 'completed'>('all')
  const [openActionsForId, setOpenActionsForId] = useState<string | null>(null)
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
    return <LoadingStateBlock />
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
            <Button
              type="button"
              onClick={() => setCreateBookingOpen(true)}
              variant="primary"
              rounded="full"
              className="gap-2 bg-white px-5 py-2 font-semibold text-indigo-700 shadow-[0_8px_20px_rgba(15,23,42,0.2)] hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4" />
              New booking
            </Button>
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

      <ManagementPanel>
        <ManagementPanelHeader
          title="Today&apos;s schedule"
          description={format(new Date(), 'EEE, MMM d')}
          actions={
            <>
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
            <ManagementSearchField
              value={query}
              onChange={(value) => setQuery(value)}
              placeholder="Search by customer name, time, or lane"
            />
            </>
          }
        />

        {filteredBookings.length === 0 ? (
          <EmptySearchBlock
            title="No reservations found matching your search."
            className="p-10"
          />
        ) : (
          <ManagementTableShell
            columns={['Time', 'Customer', 'Lanes', 'Status', 'Actions']}
            gridClassName="grid-cols-[180px_1fr_190px_220px_170px]"
          >
            {filteredBookings.map((booking, index) => {
              const rowActions = [
                {
                  key: 'details',
                  label: 'Details',
                  onClick: () => router.push(`/staff/bookings/${booking.id}`),
                },
                ...(canEditReservation(booking.status)
                  ? [{
                      key: 'edit',
                      label: 'Edit Reservation',
                      onClick: () => router.push(`/staff/bookings/${booking.id}/edit`),
                    }]
                  : []),
                ...((booking.status === 'CONFIRMED' || booking.status === 'PAID')
                  ? [{
                      key: 'check-in',
                      label: 'Check In',
                      onClick: () => router.push(`/staff/check-in?bookingId=${encodeURIComponent(booking.id)}`),
                      className: 'text-indigo-700 hover:bg-indigo-50',
                    }]
                  : []),
              ]

              return (
                <ManagementTableRow key={booking.id} index={index}>
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
                      {(() => {
                        const pill = getBookingStatusPill(booking.status, { context: 'staff-dashboard' })
                        return (
                          <BookingStatusPill
                            status={booking.status}
                            context="staff-dashboard"
                            className={pill.className}
                            label={pill.label}
                          />
                        )
                      })()}
                    </div>
                    <div className="flex justify-start">
                      <ManagementRowActionsMenu
                        menuId={booking.id}
                        triggerLabel={`Open actions for booking at ${formatTime12Hour(booking.startTime)}`}
                        actions={rowActions}
                        isOpen={openActionsForId === booking.id}
                        onOpenChange={(nextOpen) => {
                          setOpenActionsForId((current) => {
                            if (nextOpen) return booking.id
                            return current === booking.id ? null : current
                          })
                        }}
                      />
                    </div>
                  </div>
                </ManagementTableRow>
              )
            })}
          </ManagementTableShell>
        )}
      </ManagementPanel>

      {createBookingOpen && (
        <CreateBookingModal
          onClose={() => setCreateBookingOpen(false)}
          onCreated={(bookingId) => {
            setCreateBookingOpen(false)
            router.push(`/staff/bookings/${encodeURIComponent(bookingId)}`)
          }}
        />
      )}
    </div>
  )
}


