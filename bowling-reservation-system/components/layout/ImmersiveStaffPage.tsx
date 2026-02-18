'use client'

import { useEffect } from 'react'

export default function ImmersiveStaffPage() {
  useEffect(() => {
    document.body.classList.add('immersive-staff-page')

    return () => {
      document.body.classList.remove('immersive-staff-page')
    }
  }, [])

  return null
}
