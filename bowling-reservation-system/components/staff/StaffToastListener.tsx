'use client'

import { useEffect, useState } from 'react'
import Toast, { ToastVariant } from '@/components/ui/Toast'

type ToastPayload = { variant: ToastVariant; message: string }

export default function StaffToastListener() {
  const [toast, setToast] = useState<ToastPayload | null>(null)

  useEffect(() => {
    const handle = (e: Event) => {
      const payload = (e as CustomEvent<ToastPayload>).detail
      if (payload?.variant && payload?.message) {
        setToast({ variant: payload.variant, message: payload.message })
      }
    }
    window.addEventListener('staff:booking-toast', handle)
    return () => window.removeEventListener('staff:booking-toast', handle)
  }, [])

  return (
    <Toast
      message={toast?.message ?? ''}
      visible={!!toast}
      onDismiss={() => setToast(null)}
      variant={toast?.variant ?? 'error'}
      autoDismissMs={toast?.variant === 'success' ? 3000 : 5000}
    />
  )
}
