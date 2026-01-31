'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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

  useEffect(() => {
    loadBookings()
  }, [dateFilter, statusFilter])

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
      <h1 className="text-3xl font-bold mb-6">All Bookings</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PAID">Paid</option>
              <option value="CHECKED_IN">Checked In</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-600">No bookings found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {bookings.map(booking => (
              <div key={booking.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')} at {booking.startTime}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-gray-600 space-y-1">
                      <p>Lane {booking.lane} • {booking.duration / 60} hour(s)</p>
                      <p>{booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''}</p>
                      <p>Customer: {booking.user.email}</p>
                      {booking.bookingPackages.length > 0 && (
                        <p>
                          Packages: {booking.bookingPackages.map(bp => bp.package.name).join(', ')}
                        </p>
                      )}
                      <p className="font-semibold text-gray-900 mt-2">
                        Total: ${booking.totalPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/staff/bookings/${booking.id}`}>
                      <Button variant="secondary">View Details</Button>
                    </Link>
                    {(booking.status === 'CONFIRMED' || booking.status === 'PAID') && (
                      <Link href={`/staff/check-in?bookingId=${booking.id}`}>
                        <Button>Check In</Button>
                      </Link>
                    )}
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


