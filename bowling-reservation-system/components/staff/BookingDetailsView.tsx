'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { formatTime12Hour } from '@/lib/time'
import { BookingStatusPill } from '@/components/shared/status/StatusPill'
import { PageLoadingState, PageNotFoundState } from '@/components/shared/state/StateBlocks'
import BookingPackageList from '@/components/shared/booking/BookingPackageList'
import BookingLineItemsSummary from '@/components/shared/booking/BookingLineItemsSummary'
import { ManagementDetailLayout } from '@/components/shared/management/ManagementDetailLayout'
import { ManagementSection } from '@/components/shared/management/ManagementPanel'

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
  appliedDiscountCode?: string | null
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

function canEditReservationStatus(status: string) {
  return ['PENDING', 'PAID', 'CONFIRMED'].includes(status)
}

export default function BookingDetailsView() {
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
      window.dispatchEvent(new CustomEvent('staff:booking-updated'))
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
      window.dispatchEvent(new CustomEvent('staff:booking-updated'))
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
      window.dispatchEvent(new CustomEvent('staff:booking-updated'))
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
      window.dispatchEvent(new CustomEvent('staff:booking-updated'))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <PageLoadingState text="Loading booking details..." />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-6">
        <PageNotFoundState
          message="Booking not found"
          action={
            <Link href="/staff/calendar">
              <Button className="mt-4">Back to Calendar</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const shoeSizes = booking.shoeSizes ? JSON.parse(booking.shoeSizes) : []

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/staff/calendar">
          <Button variant="secondary" className="min-h-[44px] px-5">← Back to Calendar</Button>
        </Link>
        {canEditReservationStatus(booking.status) && (
          <Link href={`/staff/bookings/${booking.id}/edit`}>
            <Button variant="secondary" className="min-h-[44px] px-5">Edit reservation</Button>
          </Link>
        )}
      </div>

      <ManagementDetailLayout
        header={
          <>
            <div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">Booking Details</h1>
              <p className="text-sm text-slate-600">Booking ID: {booking.id}</p>
            </div>
            <BookingStatusPill status={booking.status} size="md" />
          </>
        }
      >
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <ManagementSection title="Customer">
            <p className="text-gray-600">
              {[booking.user.firstName, booking.user.lastName].filter(Boolean).join(' ').trim() || booking.user.email}
            </p>
          </ManagementSection>

          <ManagementSection title="Date & Time">
            <p className="text-gray-600">{format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-gray-600">{formatTime12Hour(booking.startTime)}</p>
            <p className="text-gray-600">{booking.duration / 60} hour(s)</p>
          </ManagementSection>

          <ManagementSection title="Lane & Bowlers">
            <p className="text-gray-600">
              {booking.lanes
                ? `Lanes ${(JSON.parse(booking.lanes) as number[]).join(', ')}`
                : `Lane ${booking.lane}`}
            </p>
            <p className="text-gray-600">
              {booking.numBowlers} bowler{booking.numBowlers > 1 ? 's' : ''}
            </p>
            {shoeSizes.length > 0 && <p className="text-gray-600">Shoe Rentals: {shoeSizes.join(', ')}</p>}
          </ManagementSection>
        </div>

        {booking.bookingPackages.length > 0 && (
          <ManagementSection title="Packages" className="mb-6">
            <BookingPackageList
              items={booking.bookingPackages.map((bp) => ({
                name: bp.package.name,
                description: bp.package.description,
                price: Number(bp.package.price),
              }))}
            />
          </ManagementSection>
        )}

        {booking.bookingProducts && booking.bookingProducts.length > 0 && (
          <ManagementSection title="Add-ons" className="mb-6">
            <div className="space-y-2">
              {booking.bookingProducts.map((bp, index) => (
                <div key={index} className="flex justify-between">
                  <p className="font-medium">
                    {bp.product.name} × {bp.quantity}
                  </p>
                  <p className="font-semibold">${(Number(bp.product.price) * bp.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </ManagementSection>
        )}

        {booking.overrideStatus === 'PENDING_APPROVAL' && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <h3 className="mb-2 font-semibold text-amber-800">Pending manager approval</h3>
            <p className="text-sm text-amber-700">
              Proposed total: ${Number(booking.proposedTotalPrice).toFixed(2)}
              {booking.proposedReasonCode &&
                ` · ${OVERRIDE_REASONS.find((r) => r.value === booking.proposedReasonCode)?.label ?? booking.proposedReasonCode}`}
            </p>
            {booking.proposedNotes && <p className="mt-1 text-sm text-amber-700">Notes: {booking.proposedNotes}</p>}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button onClick={handleApproveOverride} isLoading={approving} className="min-h-[44px] bg-green-600 hover:bg-green-700">
                Approve
              </Button>
              <Button variant="secondary" onClick={handleRejectOverride} isLoading={rejecting} className="min-h-[44px]">
                Reject
              </Button>
            </div>
          </div>
        )}

        <BookingLineItemsSummary
          totalLabel="Total Amount"
          totalValue={Number(booking.totalPrice)}
          actionSlot={
            <>
              {!showOverride && booking.overrideStatus !== 'PENDING_APPROVAL' ? (
                <Button variant="secondary" onClick={() => setShowOverride(true)} className="min-h-[44px] px-5">
                  Override Price
                </Button>
              ) : null}
              {(booking.status === 'CONFIRMED' || booking.status === 'PAID') && (
                <Button onClick={handleCheckIn} isLoading={checkingIn} className="min-h-[44px] px-5">
                  Check In Customer
                </Button>
              )}
              {booking.status === 'CHECKED_IN' && <span className="font-medium text-green-600">✓ Checked In</span>}
            </>
          }
        />
        <div className="mt-2 text-sm text-gray-500">
          {booking.originalTotalPrice != null && (
            <p>
              Original: ${Number(booking.originalTotalPrice).toFixed(2)}
              {booking.overrideReasonCode &&
                ` · ${OVERRIDE_REASONS.find((r) => r.value === booking.overrideReasonCode)?.label ?? booking.overrideReasonCode}`}
              {booking.overriddenAt && ` · ${format(new Date(booking.overriddenAt), 'PP')}`}
            </p>
          )}
          {booking.overrideNotes && <p className="mt-1">Notes: {booking.overrideNotes}</p>}
          {booking.appliedDiscountCode && (
            <p className="mt-2 text-indigo-800">
              Discount code: <span className="font-mono font-semibold">{booking.appliedDiscountCode}</span>
            </p>
          )}
        </div>

        {showOverride && (
          <form onSubmit={handleOverridePrice} className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
            <h3 className="mb-3 font-semibold text-slate-900">Override price</h3>
            {overrideError && <p className="mb-3 text-sm text-red-600">{overrideError}</p>}
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" isLoading={overrideSubmitting} className="min-h-[44px] px-5">
                Apply override
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowOverride(false)
                  setOverrideError(null)
                }}
                className="min-h-[44px] px-5"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <p>Created: {format(new Date(booking.createdAt), 'PPpp')}</p>
        </div>
      </ManagementDetailLayout>
    </div>
  )
}
