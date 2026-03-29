'use client'

import { useRouter } from 'next/navigation'
import CreateBookingModal from '@/components/staff/CreateBookingModal'

export default function CreateStaffBookingPage() {
  const router = useRouter()

  const onClose = () => {
    router.push('/staff/calendar')
  }

  const onCreated = (bookingId: string) => {
    router.push(`/staff/bookings/${encodeURIComponent(bookingId)}`)
  }

  return (
    <div className="px-4 py-6 sm:px-0 flex justify-center">
      <CreateBookingModal onClose={onClose} onCreated={onCreated} />
    </div>
  )
}
