'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'

/**
 * Toast for feedback. Error: full-width top bar (red). Success: centered green pill, auto-dismiss.
 */
export type ToastVariant = 'error' | 'success'

interface ToastProps {
  message: string
  visible: boolean
  onDismiss: () => void
  /** Auto-dismiss after ms; 0 = no auto-dismiss. */
  autoDismissMs?: number
  variant?: ToastVariant
}

export default function Toast({
  message,
  visible,
  onDismiss,
  autoDismissMs = 3000,
  variant = 'error',
}: ToastProps) {
  useEffect(() => {
    if (!visible || autoDismissMs <= 0) return
    const t = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(t)
  }, [visible, autoDismissMs, onDismiss])

  if (!visible) return null

  if (variant === 'success') {
    return (
      <div
        role="alert"
        className="fixed left-1/2 top-6 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <CheckCircle className="h-5 w-5 flex-shrink-0" aria-hidden />
        <p className="text-sm font-medium">{message}</p>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-3 px-4 py-3 text-white shadow-lg"
      style={{
        background: '#B91C1C',
        animation: 'step1-toast-slide-in 0.3s ease-out',
      }}
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
