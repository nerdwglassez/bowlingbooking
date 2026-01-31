'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import Button from '@/components/ui/Button'

interface Booking {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  numBowlers: number
  totalPrice: number
  status: string
  packages: Array<{
    id: string
    name: string
    price: number
  }>
}

export default function BookingConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('id')
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided')
      setLoading(false)
      return
    }

    // For now, we'll get the booking from the creation response
    // In a real app, you might want to fetch it from the API
    // For MVP, we'll store it in sessionStorage temporarily
    const bookingData = sessionStorage.getItem('lastBooking')
    if (bookingData) {
      try {
        setBooking(JSON.parse(bookingData))
        sessionStorage.removeItem('lastBooking')
      } catch (e) {
        setError('Failed to load booking details')
      }
    } else {
      setError('Booking not found. Please check your email or dashboard.')
    }
    setLoading(false)
  }, [bookingId])

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours} hour${mins > 0 ? ` ${mins} minutes` : ''}`
  }

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + duration * 60000)
    return format(endDate, 'HH:mm')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p>Loading booking details...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Booking Not Found</h1>
              <p className="text-gray-600 mb-6">{error || 'The booking could not be found.'}</p>
              <div className="flex gap-4 justify-center">
                <Link href="/book">
                  <Button>Book Again</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary">Go to Dashboard</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
            <p className="text-gray-600">
              Your booking has been created successfully
            </p>
          </div>

          {/* Booking Reference */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Booking Reference:</strong> {booking.id}
            </p>
          </div>

          {/* Booking Details */}
          <div className="space-y-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-600">Date</dt>
                  <dd className="font-medium">
                    {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Time</dt>
                  <dd className="font-medium">
                    {booking.startTime} - {calculateEndTime(booking.startTime, booking.duration)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Duration</dt>
                  <dd className="font-medium">{formatDuration(booking.duration)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Lane</dt>
                  <dd className="font-medium">Lane {booking.lane}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Number of Bowlers</dt>
                  <dd className="font-medium">{booking.numBowlers}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Status</dt>
                  <dd className="font-medium capitalize">{booking.status.toLowerCase()}</dd>
                </div>
              </dl>
            </div>

            {booking.packages && booking.packages.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Packages</h3>
                <ul className="space-y-2">
                  {booking.packages.map(pkg => (
                    <li key={pkg.id} className="text-sm">
                      {pkg.name} - ${Number(pkg.price).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total Price</span>
                <span className="text-2xl font-bold">${Number(booking.totalPrice).toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Payment information will be sent via email
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-2">What's Next?</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• A confirmation email has been sent to your registered email address</li>
              <li>• Please arrive 10 minutes before your booking time</li>
              <li>• Present your booking reference at check-in</li>
              <li>• Payment can be made upon arrival or online (if payment option is available)</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard" className="flex-1">
              <Button className="w-full">View My Bookings</Button>
            </Link>
            <Link href="/book" className="flex-1">
              <Button variant="secondary" className="w-full">
                Book Another Lane
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}


