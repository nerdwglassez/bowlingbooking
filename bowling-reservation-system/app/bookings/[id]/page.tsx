'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import { BookingStatusPill } from '@/components/shared/status/StatusPill'
import {
  PageLoadingState,
  EmptyStateCard,
} from '@/components/shared/state/StateBlocks'
import BookingPackageList from '@/components/shared/booking/BookingPackageList'
import BookingLineItemsSummary from '@/components/shared/booking/BookingLineItemsSummary'

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

  if (loading) return <PageLoadingState />

  if (!booking) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <EmptyStateCard
            title="Booking not found"
            action={
              <Link href="/bookings">
                <Button className="mt-4">Back to Bookings</Button>
              </Link>
            }
          />
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
            <BookingStatusPill label={booking.status.replace('_', ' ')} status={booking.status} size="md" />
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
              <BookingPackageList
                items={booking.bookingPackages.map((bp) => ({
                  name: bp.package.name,
                  description: bp.package.description,
                  price: Number(bp.package.price),
                }))}
              />
            </div>
          )}

          <BookingLineItemsSummary
            totalLabel="Total Amount"
            totalValue={Number(booking.totalPrice)}
            actionSlot={
              <>
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
              </>
            }
          />

          <div className="mt-6 text-sm text-gray-600">
            <p>Created: {format(new Date(booking.createdAt), 'PPpp')}</p>
          </div>
        </div>
      </div>
    </main>
  )
}

