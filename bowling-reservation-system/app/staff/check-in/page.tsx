'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { formatTime12Hour } from '@/lib/time'
import { customerDisplayName, getBookingLanes } from '@/lib/staff-booking-utils'
import CheckInModal, { type CheckInBooking } from '@/components/staff/CheckInModal'

export default function CheckInPage() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState<CheckInBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<CheckInBooking | null>(null)

  const bookingIdParam = searchParams?.get('bookingId')

  useEffect(() => {
    if (bookingIdParam) {
      loadBooking(bookingIdParam)
    }
  }, [bookingIdParam])

  useEffect(() => {
    if (!selectedBooking) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedBooking(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedBooking])

  const loadBooking = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/bookings/${id}`)
      if (!response.ok) throw new Error('Booking not found')
      const data = await response.json()
      setBookings([data.booking])
      setSearchQuery(data.booking.user.email)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const searchBookings = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setError('Please enter at least 2 characters')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Search by email
      const customersResponse = await fetch(`/api/staff/customers?q=${encodeURIComponent(searchQuery)}`)
      if (!customersResponse.ok) throw new Error('Failed to search customers')

      const customersData = await customersResponse.json()
      if (customersData.customers.length === 0) {
        setError('No customers found')
        setBookings([])
        return
      }

      // Get today's bookings for found customers
      const today = format(new Date(), 'yyyy-MM-dd')
      const bookingsResponse = await fetch(`/api/staff/bookings?date=${today}`)
      if (!bookingsResponse.ok) throw new Error('Failed to load bookings')

      const bookingsData = await bookingsResponse.json()
      const customerIds = customersData.customers.map((c: any) => c.id)
      const filteredBookings = bookingsData.bookings.filter((b: CheckInBooking) =>
        customerIds.includes(b.user.id) &&
        (b.status === 'CONFIRMED' || b.status === 'PAID')
      )

      setBookings(filteredBookings)

      if (filteredBookings.length === 0) {
        setError('No upcoming bookings found for this customer')
      }
    } catch (err: any) {
      setError(err.message)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const openCheckInModal = (booking: CheckInBooking) => {
    setError(null)
    setSelectedBooking(booking)
  }

  const refreshRef = useRef<() => void>(() => {})
  refreshRef.current = () => {
    if (searchQuery) searchBookings()
    else if (bookingIdParam) loadBooking(bookingIdParam)
  }
  useEffect(() => {
    const onBookingUpdated = () => refreshRef.current()
    window.addEventListener('staff:booking-updated', onBookingUpdated)
    return () => window.removeEventListener('staff:booking-updated', onBookingUpdated)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'PAID':
        return 'bg-yellow-100 text-yellow-800'
      case 'CHECKED_IN':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-4xl font-semibold tracking-tight mb-6">Check In Customer</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex gap-2">
          <Input
            label="Search by Email or Booking ID"
            placeholder="Enter customer email or booking ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                searchBookings()
              }
            }}
            className="flex-1"
          />
          <div className="flex items-end">
            <Button onClick={searchBookings} isLoading={loading}>
              Search
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {bookings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-slate-900">
              Upcoming Bookings for Today
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {bookings.map(booking => (
              <div key={booking.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {formatTime12Hour(booking.startTime)} – Lanes {getBookingLanes(booking).join(', ')}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{customerDisplayName(booking.user)}</p>
                    <p className="text-sm text-slate-600">
                      {booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''} • {booking.duration / 60} hour(s)
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Booking ID: {booking.id}
                    </p>
                  </div>
                  <div>
                    {booking.status === 'CHECKED_IN' ? (
                      <span className="text-green-600 font-medium">✓ Checked In</span>
                    ) : booking.status === 'COMPLETED' ? (
                      <span className="text-slate-500 text-sm">Completed</span>
                    ) : (
                      <Button onClick={() => openCheckInModal(booking)}>
                        Check In
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <CheckInModal
            initialBooking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        </div>
      )}
    </div>
  )
}


