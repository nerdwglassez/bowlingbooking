'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'

interface Booking {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  numBowlers: number
  status: string
  user: {
    id: string
    email: string
  }
}

export default function CheckInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const bookingIdParam = searchParams.get('bookingId')

  useEffect(() => {
    if (bookingIdParam) {
      loadBooking(bookingIdParam)
    }
  }, [bookingIdParam])

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
      const filteredBookings = bookingsData.bookings.filter((b: Booking) =>
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

  const handleCheckIn = async (bookingId: string) => {
    setCheckingIn(bookingId)
    setError(null)

    try {
      const response = await fetch(`/api/staff/bookings/${bookingId}/check-in`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check in')
      }

      // Reload bookings
      if (searchQuery) {
        searchBookings()
      } else if (bookingIdParam) {
        loadBooking(bookingIdParam)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCheckingIn(null)
    }
  }

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
      <h1 className="text-3xl font-bold mb-6">Check In Customer</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex gap-2">
          <Input
            label="Search by Email or Booking ID"
            placeholder="Enter customer email or booking ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
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
            <h2 className="text-xl font-semibold">
              Upcoming Bookings for Today
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {bookings.map(booking => (
              <div key={booking.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {booking.startTime} - Lane {booking.lane}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600">{booking.user.email}</p>
                    <p className="text-gray-600">
                      {booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''} • {booking.duration / 60} hour(s)
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Booking ID: {booking.id}
                    </p>
                  </div>
                  <div>
                    {booking.status === 'CHECKED_IN' ? (
                      <span className="text-green-600 font-medium">✓ Checked In</span>
                    ) : (
                      <Button
                        onClick={() => handleCheckIn(booking.id)}
                        isLoading={checkingIn === booking.id}
                      >
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
    </div>
  )
}


