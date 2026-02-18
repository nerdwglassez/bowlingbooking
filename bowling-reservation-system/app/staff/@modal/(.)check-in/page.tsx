'use client'

import { useRouter } from 'next/navigation'
import CheckInModal from '@/components/staff/CheckInModal'

export default function StaffCheckInModalPage() {
  const router = useRouter()

  const closeModal = () => {
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push('/staff')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={closeModal}
        className="absolute inset-0 cursor-default"
      />
      <div
        className="relative z-10 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <CheckInModal onClose={closeModal} />
      </div>
    </div>
  )
}
