'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingDetailsView from '@/components/staff/BookingDetailsView'

export default function StaffBookingDetailsModalPage() {
  const router = useRouter()

  const closeModal = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push('/staff/bookings')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={closeModal}
        className="absolute inset-0 cursor-default"
      />
      <div
        className="relative z-10 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <BookingDetailsView mode="modal" onClose={closeModal} />
      </div>
    </div>
  )
}
