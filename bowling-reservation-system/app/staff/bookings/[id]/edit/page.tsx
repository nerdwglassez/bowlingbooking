'use client'

import { useParams, useRouter } from 'next/navigation'
import EditReservationModal from '@/components/staff/EditReservationModal'

export default function StaffEditBookingPage() {
  const router = useRouter()
  const params = useParams()
  const id =
    params?.id != null ? (typeof params.id === 'string' ? params.id : params.id[0]) : null

  const goToDetailOrCalendar = () => {
    if (id) router.push(`/staff/bookings/${id}`)
    else router.push('/staff/calendar')
  }

  return (
    <div className="flex justify-center px-4 py-6 sm:px-0">
      <EditReservationModal
        bookingId={id}
        onClose={goToDetailOrCalendar}
        onSaved={goToDetailOrCalendar}
      />
    </div>
  )
}
