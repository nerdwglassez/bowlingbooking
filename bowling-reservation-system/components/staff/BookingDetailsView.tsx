'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, User, X } from 'lucide-react'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatTime12Hour } from '@/lib/time'
import { getBookingLanes, getPrimaryPackageName } from '@/lib/staff-booking-utils'

const OVERRIDE_REASONS = [
  { value: 'DISCOUNT', label: 'Discount' },
  { value: 'COMP', label: 'Complimentary' },
  { value: 'MANAGER_OVERRIDE', label: 'Manager override' },
  { value: 'GROUP_RATE', label: 'Group rate' },
  { value: 'OTHER', label: 'Other' },
]

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
  originalTotalPrice?: number | null
  overrideReasonCode?: string | null
  overrideNotes?: string | null
  overriddenAt?: string | null
  overrideStatus?: string | null
  proposedTotalPrice?: number | null
  proposedReasonCode?: string | null
  proposedNotes?: string | null
  proposedBy?: string | null
  proposedAt?: string | null
  lanes?: string | null
  createdAt: string
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  }
  bookingPackages: Array<{
    package: {
      name: string
      description: string | null
      price: number
    }
  }>
  bookingProducts?: Array<{
    quantity: number
    product: { name: string; price: number }
  }>
}

type BookingDetailsViewProps = {
  mode?: 'page' | 'modal'
  onClose?: () => void
}

export default function BookingDetailsView({ mode = 'page', onClose }: BookingDetailsViewProps) {
  const params = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [showOverride, setShowOverride] = useState(false)
  const [overrideSubmitting, setOverrideSubmitting] = useState(false)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideNewTotal, setOverrideNewTotal] = useState('')
  const [overrideReasonCode, setOverrideReasonCode] = useState('DISCOUNT')
  const [overrideNotes, setOverrideNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)

  const id = params?.id != null ? (typeof params.id === 'string' ? params.id : params.id[0]) : null
  const isModal = mode === 'modal'

  useEffect(() => {
    if (id) loadBooking(id)
  }, [id])

  const loadBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`)
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

  const handleOverridePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!booking) return
    const newTotal = parseFloat(overrideNewTotal)
    if (isNaN(newTotal) || newTotal <= 0) {
      setOverrideError('Enter a valid positive amount')
      return
    }
    setOverrideError(null)
    setOverrideSubmitting(true)
    try {
      const response = await fetch(`/api/staff/bookings/${booking.id}/override-price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTotal,
          reasonCode: overrideReasonCode,
          notes: overrideNotes || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to override price')
      setShowOverride(false)
      setOverrideNewTotal('')
      setOverrideNotes('')
      loadBooking(booking.id)
    } catch (err: any) {
      setOverrideError(err.message)
    } finally {
      setOverrideSubmitting(false)
    }
  }

  const handleApproveOverride = async () => {
    if (!booking) return
    setApproving(true)
    try {
      const res = await fetch(`/api/staff/bookings/${booking.id}/approve-override`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve')
      }
      loadBooking(booking.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setApproving(false)
    }
  }

  const handleRejectOverride = async () => {
    if (!booking) return
    if (!confirm('Reject this price override?')) return
    setRejecting(true)
    try {
      const res = await fetch(`/api/staff/bookings/${booking.id}/reject-override`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject')
      }
      loadBooking(booking.id)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRejecting(false)
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

  const getStatusDisplayLabel = (status: string) => {
    if (status === 'CHECKED_IN') return 'Checked In'
    if (status === 'CONFIRMED' || status === 'PAID' || status === 'PENDING') return 'Upcoming'
    if (status === 'CANCELLED') return 'Cancelled'
    return status.replace('_', ' ')
  }

  const getModalStatusPillClass = (status: string) => {
    if (status === 'CHECKED_IN') return 'bg-emerald-100 text-emerald-800'
    if (status === 'CONFIRMED' || status === 'PAID' || status === 'PENDING') return 'bg-violet-100 text-violet-800'
    if (status === 'CANCELLED') return 'bg-slate-200 text-slate-700'
    return 'bg-slate-100 text-slate-700'
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

  const customerName = [booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim() || booking.user.email
  const laneNumbers = getBookingLanes(booking)
  const shortBookingId = booking.id.length >= 4 ? `B${booking.id.slice(-4)}` : booking.id
  const primaryPackage = getPrimaryPackageName(booking)
  const bookingCreatedFormatted = format(new Date(booking.createdAt), 'MMM d, yyyy, h:mm a')
  // Booking source: schema has no source field; display "Online" as default
  const bookingSource = 'Online'

  if (isModal) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header: title, booking ID, close */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Reservation Details</h2>
            <p className="mt-1 text-sm text-slate-500">Booking ID: {shortBookingId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close reservation details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section 1: Customer name + Total price (highlighted) */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Customer name</p>
              <div className="mt-1.5 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span className="text-base font-bold text-slate-900">{customerName}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total price</p>
              <p className="mt-1.5 text-lg font-bold text-emerald-600">
                ${Number(booking.totalPrice).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Booking details */}
        <div className="mb-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Booking details
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Time</p>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900">{formatTime12Hour(booking.startTime)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Number of bowlers</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {booking.numBowlers} bowler{booking.numBowlers !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Assigned lanes</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {laneNumbers.map((ln) => (
                  <span
                    key={ln}
                    className="inline-flex rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-semibold text-indigo-800"
                  >
                    Lane {ln}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Package</p>
              <div className="mt-2">
                <span className="inline-flex rounded-lg bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-800">
                  {primaryPackage}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Booking information */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Booking information
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Booking source</p>
              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                <span className="inline-flex rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-semibold text-indigo-800">
                  {bookingSource}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Booking created</p>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900">{bookingCreatedFormatted}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Status</p>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-semibold ${getModalStatusPillClass(booking.status)}`}
                >
                  {getStatusDisplayLabel(booking.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Close button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 text-base font-bold text-white shadow-md hover:from-indigo-600 hover:to-blue-600"
        >
          Close
        </button>
      </div>
    )
  }

  const shoeSizes = booking.shoeSizes ? JSON.parse(booking.shoeSizes) : []
  const content = (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Booking Details</h1>
          <p className="text-gray-600">Booking ID: {booking.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {isModal && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
              aria-label="Close booking details"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(booking.status)}`}>
            {booking.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold mb-2">Customer</h2>
          <p className="text-gray-600">
            {[booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim() || booking.user.email}
          </p>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Date & Time</h2>
          <p className="text-gray-600">
            {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
          </p>
          <p className="text-gray-600">{formatTime12Hour(booking.startTime)}</p>
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

      {booking.bookingProducts && booking.bookingProducts.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">Add-ons</h2>
          <div className="space-y-2">
            {booking.bookingProducts.map((bp, index) => (
              <div key={index} className="flex justify-between items-start">
                <p className="font-medium">{bp.product.name} × {bp.quantity}</p>
                <p className="font-semibold">${(Number(bp.product.price) * bp.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {booking.overrideStatus === 'PENDING_APPROVAL' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="font-semibold text-amber-800 mb-2">Pending manager approval</h3>
          <p className="text-sm text-amber-700">
            Proposed total: ${Number(booking.proposedTotalPrice).toFixed(2)}
            {booking.proposedReasonCode && ` · ${OVERRIDE_REASONS.find(r => r.value === booking.proposedReasonCode)?.label ?? booking.proposedReasonCode}`}
          </p>
          {booking.proposedNotes && (
            <p className="text-sm text-amber-700 mt-1">Notes: {booking.proposedNotes}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button onClick={handleApproveOverride} isLoading={approving} className="bg-green-600 hover:bg-green-700">
              Approve
            </Button>
            <Button variant="secondary" onClick={handleRejectOverride} isLoading={rejecting}>
              Reject
            </Button>
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-2xl font-bold">${Number(booking.totalPrice).toFixed(2)}</p>
            {booking.originalTotalPrice != null && (
              <p className="text-sm text-gray-500 mt-1">
                Original: ${Number(booking.originalTotalPrice).toFixed(2)}
                {booking.overrideReasonCode && ` · ${OVERRIDE_REASONS.find(r => r.value === booking.overrideReasonCode)?.label ?? booking.overrideReasonCode}`}
                {booking.overriddenAt && ` · ${format(new Date(booking.overriddenAt), 'PP')}`}
              </p>
            )}
            {booking.overrideNotes && (
              <p className="text-sm text-gray-500 mt-1">Notes: {booking.overrideNotes}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showOverride && booking.overrideStatus !== 'PENDING_APPROVAL' ? (
              <Button variant="secondary" onClick={() => setShowOverride(true)}>
                Override Price
              </Button>
            ) : null}
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

        {showOverride && (
          <form onSubmit={handleOverridePrice} className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-3">Override price</h3>
            {overrideError && (
              <p className="text-red-600 text-sm mb-3">{overrideError}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="New total ($)"
                type="number"
                step="0.01"
                min="0"
                placeholder={Number(booking.totalPrice).toFixed(2)}
                value={overrideNewTotal}
                onChange={(e) => setOverrideNewTotal(e.target.value)}
              />
              <Select
                label="Reason"
                value={overrideReasonCode}
                onChange={(e) => setOverrideReasonCode(e.target.value)}
                className="border-slate-300 bg-white text-slate-700"
              >
                {OVERRIDE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" isLoading={overrideSubmitting}>Apply override</Button>
              <Button type="button" variant="secondary" onClick={() => { setShowOverride(false); setOverrideError(null) }}>Cancel</Button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>Created: {format(new Date(booking.createdAt), 'PPpp')}</p>
      </div>
    </div>
  )

  if (isModal) {
    return <div className="max-h-[88vh] overflow-y-auto">{content}</div>
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <Link href="/staff/bookings">
        <Button variant="secondary" className="mb-6">
          ← Back to Bookings
        </Button>
      </Link>
      {content}
    </div>
  )
}
