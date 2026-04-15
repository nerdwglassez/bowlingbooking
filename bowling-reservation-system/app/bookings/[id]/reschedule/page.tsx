'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, addDays, isBefore, startOfDay } from 'date-fns'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  EmptyStateCard,
  ErrorState,
  LoadingState,
} from '@/components/shared/state/StateBlocks'

interface Booking {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  status: string
}

interface TimeSlot {
  time: string
  available: boolean
  availableLanes: number
}

export default function RescheduleBookingPage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const id = params?.id != null ? (typeof params.id === 'string' ? params.id : params.id[0]) : null
  useEffect(() => {
    if (id) loadBooking(id)
  }, [id])

  const loadBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`)
      if (!res.ok) throw new Error('Booking not found')
      const data = await res.json()
      setBooking(data.booking)
      const today = format(new Date(), 'yyyy-MM-dd')
      setSelectedDate(today)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedDate || !booking) return
    setLoadingSlots(true)
    setError(null)
    fetch(`/api/availability?date=${selectedDate}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots || [])
        setSelectedTime('')
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, booking?.duration])

  const minDate = format(new Date(), 'yyyy-MM-dd')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking || !selectedDate || !selectedTime) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, startTime: selectedTime }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reschedule')
      router.push(`/bookings/${booking.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !booking) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          {loading ? <LoadingState /> : <ErrorState message={error || 'Booking not found'} />}
          {!loading && (
            <Link href="/bookings" className="block mt-4 text-blue-600 hover:underline">
              Back to Bookings
            </Link>
          )}
        </div>
      </main>
    )
  }

  const availableSlots = slots.filter((s) => s.available)

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <Link href={`/bookings/${booking.id}`} className="text-blue-600 hover:underline mb-6 inline-block">
          ← Back to Booking
        </Link>

        <h1 className="text-3xl font-bold mb-2">Reschedule Booking</h1>
        <p className="text-gray-600 mb-6">
          Current: {format(new Date(booking.date), 'EEEE, MMM d')} at {booking.startTime} ({booking.duration / 60} hour{booking.duration !== 60 ? 's' : ''})
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-6">
            <Input
              label="New date"
              type="date"
              value={selectedDate}
              min={minDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {loadingSlots ? (
            <div className="mb-6">
              <LoadingState text="Loading time slots..." />
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="mb-6">
              <EmptyStateCard
                title="No available slots on this date. Choose another date."
                className="border border-gray-200 bg-gray-50 p-4 text-sm"
              />
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">New time</label>
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                      selectedTime === slot.time
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!selectedDate || !selectedTime || loadingSlots || availableSlots.length === 0}
              isLoading={submitting}
            >
              Reschedule
            </Button>
            <Link href={`/bookings/${booking.id}`}>
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
