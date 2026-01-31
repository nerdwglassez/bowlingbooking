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
  numBowlers: number
  status: string
  user: {
    email: string
  }
}

export default function StaffDashboardPage() {
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    checkedIn: 0,
    upcoming: 0,
  })

  useEffect(() => {
    loadTodayBookings()
  }, [])

  const loadTodayBookings = async () => {
    try {
      const response = await fetch('/api/staff/bookings/today')
      if (!response.ok) throw new Error('Failed to load bookings')
      const data = await response.json()
      setTodayBookings(data.bookings || [])

      // Calculate stats
      const now = new Date()
      const stats = {
        total: data.bookings.length,
        confirmed: data.bookings.filter((b: Booking) => b.status === 'CONFIRMED' || b.status === 'PAID').length,
        checkedIn: data.bookings.filter((b: Booking) => b.status === 'CHECKED_IN').length,
        upcoming: data.bookings.filter((b: Booking) => {
          const bookingTime = new Date(`${b.date}T${b.startTime}`)
          return bookingTime > now && (b.status === 'CONFIRMED' || b.status === 'PAID')
        }).length,
      }
      setStats(stats)
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
        return 'bg-yellow-100 text-yellow-800'
      case 'CHECKED_IN':
        return 'bg-green-100 text-green-800'
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
      <h1 className="text-3xl font-bold mb-6">Staff Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Confirmed</p>
          <p className="text-2xl font-bold">{stats.confirmed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Checked In</p>
          <p className="text-2xl font-bold">{stats.checkedIn}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Upcoming</p>
          <p className="text-2xl font-bold">{stats.upcoming}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link href="/staff/bookings/create">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
            <h3 className="font-semibold text-lg mb-2">Create Booking</h3>
            <p className="text-gray-600 text-sm">Book a lane for a walk-in customer</p>
          </div>
        </Link>
        <Link href="/staff/check-in">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
            <h3 className="font-semibold text-lg mb-2">Check In Customer</h3>
            <p className="text-gray-600 text-sm">Mark customers as arrived</p>
          </div>
        </Link>
        <Link href="/staff/bookings">
          <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
            <h3 className="font-semibold text-lg mb-2">View All Bookings</h3>
            <p className="text-gray-600 text-sm">See all reservations</p>
          </div>
        </Link>
      </div>

      {/* Today's Bookings */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Today's Bookings</h2>
          <p className="text-sm text-gray-600">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        {todayBookings.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No bookings for today</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {todayBookings.map(booking => (
              <div key={booking.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{booking.startTime}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-600">Lane {booking.lane} • {booking.duration / 60} hour(s)</p>
                    <p className="text-gray-600">{booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''}</p>
                    <p className="text-sm text-gray-500 mt-1">{booking.user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/staff/bookings/${booking.id}`}>
                      <Button variant="secondary">View</Button>
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
        )}
      </div>
    </div>
  )
}


