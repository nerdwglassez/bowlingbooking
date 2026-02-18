'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatTime12Hour } from '@/lib/time'

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

export default function StaffEditBookingPage() {
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
    if (!id) return
    const loadBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${id}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Booking not found')
        const data = await response.json()
        setBooking(data.booking)
        setSelectedDate(format(new Date(data.booking.date), 'yyyy-MM-dd'))
      } catch (err: any) {
        setError(err.message || 'Failed to load reservation')
      } finally {
        setLoading(false)
      }
    }

    loadBooking()
  }, [id])

  useEffect(() => {
    if (!selectedDate || !booking) return
    const loadSlots = async () => {
      setLoadingSlots(true)
      setError(null)
      try {
        const response = await fetch(`/api/availability?date=${selectedDate}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Failed to load available times')
        const data = await response.json()
        setSlots(data.slots || [])
        setSelectedTime('')
      } catch (err: any) {
        setError(err.message || 'Failed to load available times')
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
  }, [selectedDate, booking?.duration])

  const minDate = format(new Date(), 'yyyy-MM-dd')
  const availableSlots = slots.filter((slot) => slot.available)
  const canEdit =
    booking?.status === 'PENDING' || booking?.status === 'PAID' || booking?.status === 'CONFIRMED'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!booking || !selectedDate || !selectedTime) return

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, startTime: selectedTime }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update reservation')

      router.push(`/staff/bookings/${booking.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update reservation')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading reservation...</div>
  }

  if (!booking) {
    return (
      <div className="p-6">
        <p className="text-slate-700">Reservation not found.</p>
        <Link href="/staff/bookings" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Back to reservations
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 px-4 py-6 sm:px-0">
      <Link href={`/staff/bookings/${booking.id}`} className="inline-block text-sm font-medium text-indigo-600 hover:underline">
        ← Back to Reservation
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Edit Reservation</h1>
        <p className="mt-2 text-sm text-slate-500">
          Current: {format(new Date(booking.date), 'EEEE, MMM d')} at {formatTime12Hour(booking.startTime)} ({booking.duration / 60} hour{booking.duration !== 60 ? 's' : ''})
        </p>

        {!canEdit ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This reservation cannot be edited in its current status.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5">
            {error ? (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mb-6 max-w-sm">
              <Input
                label="New date"
                type="date"
                value={selectedDate}
                min={minDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>

            {loadingSlots ? (
              <p className="mb-6 text-sm text-slate-500">Loading time slots...</p>
            ) : availableSlots.length === 0 ? (
              <p className="mb-6 text-sm text-slate-500">No available slots on this date. Choose another date.</p>
            ) : (
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-slate-700">New time</label>
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                        selectedTime === slot.time
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {formatTime12Hour(slot.time)}
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
                Save Changes
              </Button>
              <Link href={`/staff/bookings/${booking.id}`}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
