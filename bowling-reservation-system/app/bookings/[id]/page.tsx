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
  lanes?: string | null
  numBowlers: number
  shoeSizes: string | null
  status: string
  totalPrice: number
  createdAt: string
  bookingPackages: Array<{
    package: {
      name: string
      description: string | null
      price: number
    }
  }>
}

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const id = params?.id != null ? (typeof params.id === 'string' ? params.id : params.id[0]) : null
  useEffect(() => {
    if (id) loadBooking(id)
  }, [id])

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

  const downloadPdf = async () => {
    if (!booking) return
    setDownloadingPdf(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/receipt`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${booking.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const cancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    setCancelling(true)
    try {
      const response = await fetch(`/api/bookings/${booking!.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to cancel booking')
      router.push('/bookings')
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking')
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">Loading...</div>
      </main>
    )
  }

  if (!booking) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p>Booking not found</p>
          <Link href="/bookings">
            <Button className="mt-4">Back to Bookings</Button>
          </Link>
        </div>
      </main>
    )
  }

  const canCancelOrReschedule =
    (booking.status === 'PENDING' || booking.status === 'PAID' || booking.status === 'CONFIRMED')
  const bookingStart = new Date(`${booking.date}T${booking.startTime}`)
  const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const withinCutoff = bookingStart <= cutoff
  const cancelRescheduleMessage = withinCutoff
    ? 'Cancellation and reschedule must be at least 24 hours before the booking. Please contact us for help.'
    : null

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

  const shoeSizes = booking.shoeSizes ? JSON.parse(booking.shoeSizes) : []

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Link href="/bookings" className="no-print">
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
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                booking.status
              )}`}
            >
              {booking.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
              <p className="text-gray-600">
                {booking.lanes
                  ? `Lanes ${(JSON.parse(booking.lanes) as number[]).join(', ')}`
                  : `Lane ${booking.lane}`}
              </p>
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
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">${Number(booking.totalPrice).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap no-print">
                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                >
                  Print receipt
                </Button>
                <Button
                  variant="secondary"
                  onClick={downloadPdf}
                  isLoading={downloadingPdf}
                >
                  Download PDF
                </Button>
                {canCancelOrReschedule && (
                  <>
                    {cancelRescheduleMessage && (
                      <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded">
                        {cancelRescheduleMessage}
                      </p>
                    )}
                    {!withinCutoff && (
                      <>
                        <Link href={`/bookings/${booking.id}/reschedule`}>
                          <Button variant="secondary" title="Change date or time">
                            Modify Booking
                          </Button>
                        </Link>
                        <Button variant="danger" onClick={cancelBooking} isLoading={cancelling}>
                          Cancel Booking
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p>Created: {format(new Date(booking.createdAt), 'PPpp')}</p>
          </div>
        </div>
      </div>
    </main>
  )
}

