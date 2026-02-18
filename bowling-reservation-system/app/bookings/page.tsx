'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'

interface Booking {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  lanes?: string | null
  numBowlers: number
  status: string
  totalPrice: number
  bookingPackages: Array<{
    package: {
      name: string
      price: number
    }
  }>
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      const response = await fetch('/api/bookings')
      if (!response.ok) throw new Error('Failed to load bookings')
      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to cancel booking')

      loadBookings()
    } catch (err) {
      alert('Failed to cancel booking')
    }
  }

  const now = new Date()
  const getNumLanes = (b: Booking) => {
    if (!b.lanes) return 1
    try {
      const arr = JSON.parse(b.lanes) as number[] | string[]
      return Array.isArray(arr) ? arr.length : 1
    } catch {
      return 1
    }
  }
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date + 'T' + booking.startTime)
    if (filter === 'upcoming') return bookingDate >= now && booking.status !== 'CANCELLED'
    if (filter === 'past') return bookingDate < now || booking.status === 'CANCELLED'
    return true
  })

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
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <Link href="/book">
            <Button>Book a Lane</Button>
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 mb-4">No bookings found</p>
            <Link href="/book">
              <Button>Book Your First Lane</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map(booking => {
              const bookingDate = new Date(booking.date + 'T' + booking.startTime)
              return (
              <div key={booking.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')} at{' '}
                        {booking.startTime}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-gray-600 space-y-1">
                      <p>Lane {booking.lane} • {booking.duration / 60} hour(s)</p>
                      <p>{booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''}</p>
                      {booking.bookingPackages.length > 0 && (
                        <p>
                          Packages:{' '}
                          {booking.bookingPackages.map(bp => bp.package.name).join(', ')}
                        </p>
                      )}
                      <p className="font-semibold text-gray-900 mt-2">
                        Total: ${Number(booking.totalPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/bookings/${booking.id}`}>
                      <Button variant="secondary">View Details</Button>
                    </Link>
                    {bookingDate < now && booking.status !== 'CANCELLED' && (
                      <Link
                        href={`/book?date=${booking.date}&time=${booking.startTime}&duration=${booking.duration}&numLanes=${getNumLanes(booking)}`}
                      >
                        <Button variant="secondary">Book Again</Button>
                      </Link>
                    )}
                    {booking.status === 'PENDING' && (
                      <Button
                        variant="danger"
                        onClick={() => cancelBooking(booking.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
            })}
          </div>
        )}
      </div>
    </main>
  )
}


