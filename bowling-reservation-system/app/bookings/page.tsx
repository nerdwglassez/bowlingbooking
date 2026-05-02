'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import PillFilterBar from '@/components/shared/filters/PillFilterBar'
import { BookingStatusPill } from '@/components/shared/status/StatusPill'
import { PageEmptyState, PageLoadingState } from '@/components/shared/state/StateBlocks'
import BookingPackageList from '@/components/shared/booking/BookingPackageList'

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
      const response = await fetch('/api/bookings', { credentials: 'include' })
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

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <PageLoadingState />
        </div>
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
        <PillFilterBar
          className="mb-6"
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
            { value: 'all', label: 'All' },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
        />

        {filteredBookings.length === 0 ? (
          <PageEmptyState
            title="No bookings found"
            action={
              <Link href="/book">
                <Button>Book Your First Lane</Button>
              </Link>
            }
          />
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
                      <BookingStatusPill status={booking.status} size="sm" />
                    </div>
                    <div className="text-gray-600 space-y-1">
                      <p>Lane {booking.lane} • {booking.duration / 60} hour(s)</p>
                      <p>{booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''}</p>
                      <BookingPackageList
                        items={booking.bookingPackages.map((bp, index) => ({
                          id: `${booking.id}-${index}`,
                          name: bp.package.name,
                          price: Number(bp.package.price),
                        }))}
                        inline
                      />
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


