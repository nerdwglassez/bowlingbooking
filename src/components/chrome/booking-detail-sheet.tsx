'use client'

import { useEffect, useState } from 'react'

import { BottomSheet } from '@/components/chrome/bottom-sheet'
import { StaffBookingDetailContent } from '@/components/patterns/staff-booking-detail-content'
import { BookingModifySheet } from '@/components/chrome/booking-modify-sheet'
import type { StaffBookingDetail } from '@/lib/actions/staff'
import { getBookingDetail } from '@/lib/actions/staff'

function BookingDetailLoader({
  bookingId,
  canRefund,
  onModify,
}: {
  bookingId: string
  canRefund: boolean
  onModify: (booking: StaffBookingDetail) => void
}) {
  const [booking, setBooking] = useState<StaffBookingDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const detail = await getBookingDetail(bookingId)
        if (cancelled) return
        if (!detail) setError('Booking not found.')
        else setBooking(detail)
      } catch {
        if (!cancelled) setError('Could not load booking.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bookingId])

  if (error) {
    return <p className="text-sm text-[var(--status-error-text)]">{error}</p>
  }
  if (!booking) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
    )
  }

  return (
    <StaffBookingDetailContent
      booking={booking}
      canRefund={canRefund}
      compact
      onModify={() => onModify(booking)}
    />
  )
}

export function BookingDetailSheet({
  bookingId,
  tenantId,
  bowlersPerLane = 6,
  open,
  onClose,
  canRefund,
}: {
  bookingId: string | null
  tenantId: string
  bowlersPerLane?: number
  open: boolean
  onClose: () => void
  canRefund: boolean
}) {
  const [modifyOpen, setModifyOpen] = useState(false)
  const [bookingForModify, setBookingForModify] =
    useState<StaffBookingDetail | null>(null)
  const [detailKey, setDetailKey] = useState(0)

  return (
    <>
      <BottomSheet
        open={open}
        title={bookingForModify?.customerName ?? 'Booking'}
        onClose={onClose}
      >
        <div className="p-4">
          {open && bookingId ? (
            <BookingDetailLoader
              key={`${bookingId}-${detailKey}`}
              bookingId={bookingId}
              canRefund={canRefund}
              onModify={(booking) => {
                setBookingForModify(booking)
                setModifyOpen(true)
              }}
            />
          ) : null}
        </div>
      </BottomSheet>

      <BookingModifySheet
        open={modifyOpen}
        booking={bookingForModify}
        tenantId={tenantId}
        bowlersPerLane={bowlersPerLane}
        onClose={() => setModifyOpen(false)}
        onSaved={() => {
          setModifyOpen(false)
          setDetailKey((k) => k + 1)
        }}
      />
    </>
  )
}
