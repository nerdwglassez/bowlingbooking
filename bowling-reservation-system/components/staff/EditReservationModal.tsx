'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { X } from 'lucide-react'
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
  lanes?: string | null
  numBowlers: number
  status: string
  user: {
    id: string
    firstName?: string | null
    lastName?: string | null
    email: string
  }
  bookingPackages: Array<{ package: { name: string } }>
}

interface TimeSlot {
  time: string
  available: boolean
  availableLanes: number
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CHECKED_IN', label: 'Checked In' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

type Props = { onClose: () => void; onSaved?: () => void; /** When provided (e.g. when opened as modal from dashboard), used instead of route params */ bookingId?: string | null }

export default function EditReservationModal({ onClose, onSaved, bookingId: bookingIdProp }: Props) {
  const params = useParams()
  const id =
    bookingIdProp ??
    (params?.id != null ? (typeof params.id === 'string' ? params.id : params.id[0]) : null)

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [numBowlers, setNumBowlers] = useState(0)
  const [lanesCsv, setLanesCsv] = useState('')
  const [status, setStatus] = useState('')
  const [customerFirstName, setCustomerFirstName] = useState('')
  const [customerLastName, setCustomerLastName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/bookings/${id}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Booking not found')
        return res.json()
      })
      .then((data) => {
        const b = data.booking
        setBooking(b)
        setSelectedDate(format(new Date(b.date), 'yyyy-MM-dd'))
        setSelectedTime(b.startTime)
        setNumBowlers(b.numBowlers)
        setLanesCsv(
          b.lanes
            ? (() => {
                try {
                  const arr = JSON.parse(b.lanes)
                  return Array.isArray(arr) ? arr.join(', ') : String(b.lane)
                } catch {
                  return String(b.lane)
                }
              })()
            : String(b.lane)
        )
        setStatus(b.status)
        setCustomerFirstName(b.user?.firstName ?? '')
        setCustomerLastName(b.user?.lastName ?? '')
        setCustomerEmail(b.user?.email ?? '')
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!selectedDate || !booking) return
    setLoadingSlots(true)
    fetch(`/api/availability?date=${selectedDate}`)
      .then((res) => res.ok ? res.json() : { slots: [] })
      .then((data) => {
        setSlots(data.slots || [])
        setSelectedTime('')
      })
      .finally(() => setLoadingSlots(false))
  }, [selectedDate, booking?.duration])

  const canEdit = booking && ['PENDING', 'PAID', 'CONFIRMED'].includes(booking.status)
  const availableSlots = slots.filter((s) => s.available)
  const minDate = format(new Date(), 'yyyy-MM-dd')
  const timeChanged =
    booking &&
    (selectedDate !== format(new Date(booking.date), 'yyyy-MM-dd') || selectedTime !== booking.startTime)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking) return
    setError(null)
    setSubmitting(true)
    try {
      const timeChanged = selectedDate !== format(new Date(booking.date), 'yyyy-MM-dd') || selectedTime !== booking.startTime
      if (timeChanged && canEdit) {
        const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: selectedDate, startTime: selectedTime }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to reschedule')
      }

      const lanesTrimmed = lanesCsv.trim().replace(/\s*,\s*/g, ',').replace(/\s+/g, ',')
      const lanesArray = lanesTrimmed
        ? lanesTrimmed.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !Number.isNaN(n))
        : []
      const lanesPayload = lanesArray.length > 0 ? lanesArray.join(',') : undefined

      const updatePayload: { numBowlers?: number; lanes?: string; status?: string } = {}
      if (numBowlers !== booking.numBowlers) updatePayload.numBowlers = numBowlers
      if (lanesPayload !== undefined) updatePayload.lanes = lanesPayload
      if (status !== booking.status) updatePayload.status = status

      if (Object.keys(updatePayload).length > 0) {
        const res = await fetch(`/api/staff/bookings/${booking.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update booking')
      }

      const contactChanged =
        booking.user &&
        (customerFirstName !== (booking.user.firstName ?? '') ||
          customerLastName !== (booking.user.lastName ?? '') ||
          customerEmail !== (booking.user.email ?? ''))
      if (contactChanged && booking.user.id) {
        const payload: { firstName?: string; lastName?: string; email?: string } = {}
        payload.firstName = customerFirstName.trim()
        payload.lastName = customerLastName.trim()
        if (customerEmail.trim()) payload.email = customerEmail.trim()
        const customerRes = await fetch(`/api/staff/customers/${booking.user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const customerData = await customerRes.json()
        if (!customerRes.ok) throw new Error(customerData.error || 'Failed to update contact')
      }

      onSaved?.()
      window.dispatchEvent(new CustomEvent('staff:booking-updated'))
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
      window.dispatchEvent(
        new CustomEvent('staff:booking-toast', {
          detail: { variant: 'error', message: 'An error occurred. Please try again.' },
        })
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelReservation = async () => {
    if (!booking || !confirm('Cancel this reservation? This cannot be undone.')) return
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel')
      }
      window.dispatchEvent(
        new CustomEvent('staff:booking-toast', {
          detail: { variant: 'success', message: 'Reservation cancelled.' },
        })
      )
      onSaved?.()
      window.dispatchEvent(new CustomEvent('staff:booking-updated'))
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation')
      window.dispatchEvent(
        new CustomEvent('staff:booking-toast', {
          detail: { variant: 'error', message: 'An error occurred. Please try again.' },
        })
      )
    } finally {
      setCancelling(false)
    }
  }

  if (loading || !id) {
    return (
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-slate-500">Loading reservation…</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-slate-700">Reservation not found.</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="mt-3 h-auto p-0 text-sm font-medium text-indigo-600 hover:bg-transparent hover:underline"
        >
          Close
        </Button>
      </div>
    )
  }

  const shortId = booking.id.length >= 4 ? `B${booking.id.slice(-4)}` : booking.id
  const primaryPackage = booking.bookingPackages[0]?.package?.name ?? ''

  return (
    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-900">Edit reservation</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          rounded="full"
          onClick={onClose}
          className="h-10 w-10 shrink-0 bg-slate-100 text-slate-500 hover:bg-slate-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-6">
        <div className="mb-6 rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-500">Booking ID: {shortId}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
              <Input
                type="text"
                value={customerFirstName}
                onChange={(e) => setCustomerFirstName(e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
              <Input
                type="text"
                value={customerLastName}
                onChange={(e) => setCustomerLastName(e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
            <div className="flex flex-wrap gap-3">
              <Input
                type="date"
                value={selectedDate}
                min={minDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="max-w-[140px]"
              />
              {loadingSlots ? (
                <span className="text-sm text-slate-500">Loading…</span>
              ) : availableSlots.length === 0 ? (
                <span className="text-sm text-slate-500">No slots this date</span>
              ) : (
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">Select time</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.time} value={slot.time}>
                      {formatTime12Hour(slot.time)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Number of bowlers</label>
            <Input
              type="number"
              min={1}
              max={24}
              value={numBowlers || ''}
              onChange={(e) => setNumBowlers(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lanes (comma separated)</label>
            <Input
              type="text"
              value={lanesCsv}
              onChange={(e) => setLanesCsv(e.target.value)}
              placeholder="e.g. 5, 6"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Package (optional)</label>
            <Input type="text" value={primaryPackage} disabled className="bg-slate-50" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={onClose} className="rounded-xl px-4 py-2.5">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !canEdit ||
                  submitting ||
                  !!(
                    timeChanged &&
                    (!selectedTime || availableSlots.length === 0)
                  )
                }
                isLoading={submitting}
                className="rounded-xl px-4 py-2.5"
              >
                Save changes
              </Button>
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="danger"
                rounded="xl"
                size="sm"
                onClick={handleCancelReservation}
                disabled={cancelling}
                className="px-4 py-2.5 font-semibold"
              >
                {cancelling ? 'Cancelling…' : 'Cancel reservation'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
