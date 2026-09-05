'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle } from '@untitledui/icons'

import { CloseButton } from '@/components/base/buttons/close-button'
import { FeaturedIcon } from '@/components/foundations/featured-icon/featured-icon'

export type StaffToastVariant = 'success' | 'error'

export interface StaffToastOptions {
  message: string
  variant?: StaffToastVariant
  durationMs?: number
  dismissible?: boolean
}

interface ToastRecord extends StaffToastOptions {
  id: string
}

interface StaffToastContextValue {
  showToast: (options: StaffToastOptions) => void
}

const StaffToastContext = createContext<StaffToastContextValue | null>(null)

const DEFAULT_DURATION: Record<StaffToastVariant, number> = {
  success: 3000,
  error: 5000,
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord
  onDismiss: (id: string) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const variant = toast.variant ?? 'success'

  useEffect(() => {
    const ms = toast.durationMs ?? DEFAULT_DURATION[variant]
    if (ms <= 0) return
    timerRef.current = setTimeout(() => onDismiss(toast.id), ms)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.durationMs, toast.id, onDismiss, variant])

  const isSuccess = variant === 'success'

  return (
    <div
      role="alert"
      className="relative flex gap-3 rounded-xl border border-primary bg-primary_alt p-4 shadow-xs"
    >
      <FeaturedIcon
        icon={isSuccess ? CheckCircle : AlertCircle}
        color={isSuccess ? 'success' : 'error'}
        theme="outline"
        size="md"
      />
      <p className="min-w-0 flex-1 pr-8 text-sm font-semibold text-secondary">
        {toast.message}
      </p>
      {toast.dismissible !== false ? (
        <CloseButton
          size="sm"
          slot={null}
          label="Dismiss"
          className="absolute top-2 right-2"
          onPress={() => onDismiss(toast.id)}
        />
      ) : null}
    </div>
  )
}

export function StaffToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((options: StaffToastOptions) => {
    setToasts((prev) => [...prev, { ...options, id: crypto.randomUUID() }])
  }, [])

  return (
    <StaffToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] lg:inset-x-auto lg:right-0 lg:items-end"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full max-w-md">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </StaffToastContext.Provider>
  )
}

export function useStaffToast(): StaffToastContextValue {
  const ctx = useContext(StaffToastContext)
  if (!ctx) {
    throw new Error('useStaffToast must be used inside StaffToastProvider')
  }
  return ctx
}
