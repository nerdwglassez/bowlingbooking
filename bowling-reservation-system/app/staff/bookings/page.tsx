'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffBookingsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/staff/calendar')
  }, [router])

  return (
    <div className="px-4 py-6 sm:px-0 flex items-center justify-center min-h-[200px]">
      <p className="text-slate-500">Redirecting to calendar…</p>
    </div>
  )
}
