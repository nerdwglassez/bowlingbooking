'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Clock3, X } from 'lucide-react'
import { formatTime12Hour } from '@/lib/time'
import {
  customerDisplayName,
  getBookingLanes,
  getPrimaryPackageName,
  getInitials,
} from '@/lib/staff-booking-utils'

export interface CheckInBooking {
  id: string
  date: string
  startTime: string
  duration: number
  lane: number
  lanes?: string | null
  numBowlers: number
  status: string
  bookingPackages?: Array<{ package?: { name: string } }>
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  }
}

type Props = { onClose: () => void; initialBooking?: CheckInBooking | null }

export default function CheckInModal({ onClose, initialBooking }: Props) {
  const searchParams = useSearchParams()
  const bookingId = searchParams?.get('bookingId')

  const [booking, setBooking] = useState<CheckInBooking | null>(initialBooking ?? null)
  const [loading, setLoading] = useState(!initialBooking && !!bookingId)
  const [error, setError] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (initialBooking !== undefined) {
      setBooking(initialBooking ?? null)
      setLoading(false)
      return
    }
    if (!bookingId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/bookings/${bookingId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Booking not found')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setBooking(data.booking)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load booking')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bookingId, initialBooking])

  const cannotCheckIn = booking && (booking.status === 'CHECKED_IN' || booking.status === 'COMPLETED')

  const handleCheckIn = async () => {
    if (!booking || cannotCheckIn) return
    setCheckingIn(true)
    setError(null)
    try {
      const res = await fetch(`/api/staff/bookings/${booking.id}/check-in`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to check in')
      }
      window.dispatchEvent(new CustomEvent('staff:booking-updated'))
      window.dispatchEvent(
        new CustomEvent('staff:booking-toast', {
          detail: { variant: 'success', message: 'Customer checked in.' },
        })
      )
      onClose()
    } catch (err: any) {
      setError(err.message)
      window.dispatchEvent(
        new CustomEvent('staff:booking-toast', {
          detail: { variant: 'error', message: 'An error occurred. Please try again.' },
        })
      )
    } finally {
      setCheckingIn(false)
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Check-in customer</h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <p className="py-8 text-center text-sm text-slate-500">Loading reservation…</p>
      )}

      {error && !booking && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!bookingId && !loading && (
        <p className="py-6 text-center text-sm text-slate-600">
          Select a booking from Today&apos;s schedule to check in.
        </p>
      )}

      {booking && !loading && (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-lg font-semibold text-white">
                {getInitials(booking.user)}
              </div>
              <div>
                <p className="text-xl font-semibold text-slate-900">
                  {customerDisplayName(booking.user)}
                </p>
                <p className="text-sm text-slate-500">
                  Booking ID: B{booking.id.slice(-4)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
              <div className="flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                <span>Time: <strong>{formatTime12Hour(booking.startTime)}</strong></span>
              </div>
              <div>Lanes: <strong>{getBookingLanes(booking).join(', ')}</strong></div>
              <div>Bowlers: <strong>{booking.numBowlers}</strong></div>
              <div className="col-span-2">Package: <strong>{getPrimaryPackageName(booking)}</strong></div>
            </div>
          </div>
          <p className="mb-5 text-sm text-slate-500">
            {cannotCheckIn
              ? booking.status === 'COMPLETED'
                ? 'This reservation has been completed and cannot be checked in.'
                : 'This reservation is already checked in.'
              : 'Confirm that this customer has arrived and is ready to start their session.'}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={checkingIn || !!cannotCheckIn}
              className="min-h-[44px] flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(16,185,129,0.35)] hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingIn ? 'Checking in...' : 'Confirm check-in'}
            </button>
          </div>
        </>
      )}

      {!booking && !loading && bookingId && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-slate-600">Reservation not found.</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
