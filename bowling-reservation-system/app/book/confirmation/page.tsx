'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import Button from '@/components/ui/Button'

interface Booking {
  id: string
  checkInToken?: string | null
  date: string
  startTime: string
  duration: number
  lane: number
  lanes?: string | null
  numBowlers: number
  totalPrice: number
  status: string
  bookingPackages: Array<{
    package: {
      id: string
      name: string
      description: string | null
      price: number
    }
  }>
}

function ConfirmationContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams?.get('bookingId') ?? searchParams?.get('id')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(() => Boolean(bookingId))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookingId) return

    let cancelled = false
    const t = setTimeout(() => {
      setLoading(true)
      setError(null)
      fetch(`/api/bookings/${bookingId}`)
        .then(res => {
          if (!res.ok) throw new Error('Booking not found')
          return res.json()
        })
        .then(data => {
          if (!cancelled) setBooking(data.booking)
        })
        .catch(() => {
          if (!cancelled) {
            setError('Booking not found. Please check your email or dashboard.')
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
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

  const addToCalendarUrl = booking
    ? (() => {
        const start = new Date(booking.date)
        const [h, m] = booking.startTime.split(':').map(Number)
        start.setHours(h, m, 0, 0)
        const end = new Date(start.getTime() + booking.duration * 60000)
        const title = encodeURIComponent('Bowling Lane Booking')
        const dates = `${format(start, 'yyyyMMdd')}T${format(start, 'HHmmss')}Z/${format(end, 'yyyyMMdd')}T${format(end, 'HHmmss')}Z`
        const details = encodeURIComponent(
                  booking.lanes
                    ? `Booking ref: ${booking.id}. Lanes ${(JSON.parse(booking.lanes) as number[]).join(', ')}.`
                    : `Booking ref: ${booking.id}. Lane ${booking.lane}.`
                )
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`
      })()
    : '#'

  const kioskCheckInData =
    typeof window !== 'undefined' && booking
      ? `${window.location.origin}/kiosk/check-in?${booking.checkInToken ? `token=${encodeURIComponent(booking.checkInToken)}` : `booking=${encodeURIComponent(booking.id)}`}`
      : ''
  const qrCodeUrl = kioskCheckInData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(kioskCheckInData)}`
    : ''

  if (!bookingId) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Missing booking</h1>
              <p className="text-gray-600 mb-6">No booking ID was provided. Open this page from your confirmation link or your dashboard.</p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/book">
                  <Button>Book a Lane</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary">View My Bookings</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
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
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/book">
                  <Button>Book a Lane</Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary">View My Bookings</Button>
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
          {/* Success Header (PRD Step 5) */}
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
            <h1 className="text-3xl font-bold mb-2">Your Booking is Confirmed!</h1>
            <p className="text-gray-600">
              Confirmation code and details are below.
            </p>
          </div>

          {/* Confirmation code (prominent) + QR code */}
          <div className="border-2 border-blue-200 rounded-xl p-4 mb-6 bg-blue-50/50">
            <p className="text-sm text-blue-800 font-medium mb-1">Confirmation code</p>
            <p className="text-xl font-bold text-gray-900 tracking-tight break-all">
              {booking.id}
            </p>
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR code for check-in"
                  className="w-[150px] h-[150px] rounded-lg border border-gray-200 bg-white"
                />
              )}
              <p className="text-sm text-gray-600">
                Show this QR code or confirmation code at check-in.
              </p>
            </div>
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
                    {booking.startTime} – {calculateEndTime(booking.startTime, booking.duration)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Duration</dt>
                  <dd className="font-medium">{formatDuration(booking.duration)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Lane{booking.lanes ? 's' : ''}</dt>
                  <dd className="font-medium">
                    {booking.lanes
                      ? `Lanes ${(JSON.parse(booking.lanes) as number[]).join(', ')}`
                      : `Lane ${booking.lane}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Number of Bowlers</dt>
                  <dd className="font-medium">{booking.numBowlers}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600">Status</dt>
                  <dd className="font-medium capitalize">{booking.status.toLowerCase().replace('_', ' ')}</dd>
                </div>
              </dl>
            </div>

            {booking.bookingPackages && booking.bookingPackages.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Packages</h3>
                <ul className="space-y-2">
                  {booking.bookingPackages.map((bp, index) => (
                    <li key={index} className="text-sm">
                      {bp.package.name} – ${Number(bp.package.price).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">${Number(booking.totalPrice).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Add to Calendar + View My Bookings + Print (PRD Step 5) */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap">
            <a
              href={addToCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[140px]"
            >
              <Button variant="secondary" className="w-full">
                Add to Calendar
              </Button>
            </a>
            <Link href="/dashboard" className="flex-1 min-w-[140px]">
              <Button className="w-full">View My Bookings</Button>
            </Link>
            <Button
              variant="secondary"
              className="w-full sm:w-auto min-w-[140px]"
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>

          <div className="text-center">
            <Link href="/book" className="text-blue-600 hover:underline text-sm">
              Book another lane
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<main className="max-w-2xl mx-auto p-8"><p className="text-gray-600">Loading...</p></main>}>
      <ConfirmationContent />
    </Suspense>
  )
}

