'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  shoeSizes: string | null
  status: string
  totalPrice: number
  createdAt: string
  user: {
    id: string
    email: string
  }
  bookingPackages: Array<{
    package: {
      name: string
      description: string | null
      price: number
    }
  }>
}

export default function StaffBookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadBooking(params.id as string)
    }
  }, [params.id])

  const loadBooking = async (id: string) => {
    try {
      const response = await fetch(`/api/bookings/${id}`)
      if (!response.ok) throw new Error('Failed to load booking')
      const data = await response.json()
      setBooking(data.booking)
    } catch (err) {
      console.error('Failed to load booking:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!booking) return

    setCheckingIn(true)
    try {
      const response = await fetch(`/api/staff/bookings/${booking.id}/check-in`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to check in')
      }

      loadBooking(booking.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCheckingIn(false)
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

  if (!booking) {
    return (
      <div className="p-6">
        <p>Booking not found</p>
        <Link href="/staff/bookings">
          <Button className="mt-4">Back to Bookings</Button>
        </Link>
      </div>
    )
  }

  const shoeSizes = booking.shoeSizes ? JSON.parse(booking.shoeSizes) : []

  return (
    <div className="px-4 py-6 sm:px-0">
      <Link href="/staff/bookings">
        <Button variant="secondary" className="mb-6">
          ← Back to Bookings
        </Button>
      </Link>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Booking Details</h1>
            <p className="text-gray-600">Booking ID: {booking.id}</p>
          </div>
          <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(booking.status)}`}>
            {booking.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-semibold mb-2">Customer</h2>
            <p className="text-gray-600">{booking.user.email}</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Date & Time</h2>
            <p className="text-gray-600">
              {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-gray-600">{booking.startTime}</p>
            <p className="text-gray-600">{booking.duration / 60} hour(s)</p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Lane & Bowlers</h2>
            <p className="text-gray-600">Lane {booking.lane}</p>
            <p className="text-gray-600">
              {booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''}
            </p>
            {shoeSizes.length > 0 && (
              <p className="text-gray-600">
                Shoe Rentals: {shoeSizes.join(', ')}
              </p>
            )}
          </div>
        </div>

        {booking.bookingPackages.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-2">Packages</h2>
            <div className="space-y-2">
              {booking.bookingPackages.map((bp, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{bp.package.name}</p>
                    {bp.package.description && (
                      <p className="text-sm text-gray-600">{bp.package.description}</p>
                    )}
                  </div>
                  <p className="font-semibold">${Number(bp.package.price).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold">${booking.totalPrice.toFixed(2)}</p>
            </div>
            {(booking.status === 'CONFIRMED' || booking.status === 'PAID') && (
              <Button onClick={handleCheckIn} isLoading={checkingIn}>
                Check In Customer
              </Button>
            )}
            {booking.status === 'CHECKED_IN' && (
              <span className="text-green-600 font-medium">✓ Checked In</span>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p>Created: {format(new Date(booking.createdAt), 'PPpp')}</p>
        </div>
      </div>
    </div>
  )
}

