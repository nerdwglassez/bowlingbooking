'use client'

import { useRouter } from 'next/navigation'
import CheckInModal from '@/components/staff/CheckInModal'

export default function CheckInPage() {
  const router = useRouter()

  const onClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/staff')
    }
  }

  return (
    <div className="px-4 py-6 sm:px-0 flex justify-center">
      <div className="w-full max-w-md">
        <CheckInModal onClose={onClose} />
      </div>
    </div>
  )
}
