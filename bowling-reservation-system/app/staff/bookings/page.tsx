'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { MoreVertical } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatTime12Hour } from '@/lib/time'

interface Booking {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  numBowlers: number
  status: string
  totalPrice: number
  user: {
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  bookingPackages: Array<{
    package: {
      name: string
    }
  }>
}

export default function StaffBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [openActionsForId, setOpenActionsForId] = useState<string | null>(null)
  const [openActionsUpwardForId, setOpenActionsUpwardForId] = useState<string | null>(null)

  useEffect(() => {
    loadBookings()
  }, [dateFilter, statusFilter])

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

  const loadBookings = async () => {
    setLoading(true)
    try {
      let url = '/api/staff/bookings'
      const params = new URLSearchParams()
      if (dateFilter) {
        params.append('date', dateFilter)
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (params.toString()) {
        url += '?' + params.toString()
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to load bookings')
      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CHECKED_IN':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-4xl font-semibold tracking-tight mb-6">All Bookings</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-slate-300 bg-white text-slate-700"
          >
            <option value="all">All</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-sm text-slate-500">No bookings found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-visible">
          <div className="divide-y divide-gray-200">
            {bookings.map(booking => (
              <div key={booking.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')} at {formatTime12Hour(booking.startTime)}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p>Lane {booking.lane} • {booking.duration / 60} hour(s)</p>
                      <p>{booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''}</p>
                      <p>Customer: {[booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim() || booking.user.email}</p>
                      {booking.bookingPackages.length > 0 && (
                        <p>
                          Packages: {booking.bookingPackages.map(bp => bp.package.name).join(', ')}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-slate-900 mt-2">
                        Total: ${Number(booking.totalPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="relative" data-actions-menu-root="true">
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={openActionsForId === booking.id}
                      aria-label={`Open actions for booking at ${formatTime12Hour(booking.startTime)}`}
                      onClick={(event) => {
                        const target = event.currentTarget as HTMLButtonElement | null
                        const rect = target?.getBoundingClientRect()
                        const MENU_ESTIMATED_HEIGHT = 150
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
                        className={`absolute right-0 z-20 min-w-[170px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ${
                          openActionsUpwardForId === booking.id ? 'bottom-11' : 'top-11'
                        }`}
                      >
                        <Link
                          href={`/staff/bookings/${booking.id}`}
                          role="menuitem"
                          onClick={() => setOpenActionsForId(null)}
                          className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          View Details
                        </Link>
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


