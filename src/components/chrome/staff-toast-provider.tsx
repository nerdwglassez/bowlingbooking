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
import { Check, X } from 'lucide-react'

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
      className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-elevated)] px-4 py-3 text-[var(--color-text-primary)] shadow-[var(--shadow-lg)]"
    >
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
          isSuccess
            ? 'bg-[var(--status-ok-bg)] text-[var(--status-ok-text)]'
            : 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
        }`}
        aria-hidden
      >
        {isSuccess ? (
          <Check className="size-3.5" strokeWidth={2.5} />
        ) : (
          <X className="size-3.5" strokeWidth={2.5} />
        )}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-snug">{toast.message}</p>
      {toast.dismissible !== false ? (
        <button
          type="button"
          className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          aria-label="Dismiss"
          onClick={() => onDismiss(toast.id)}
        >
          <X className="size-4" />
        </button>
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
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:inset-x-auto md:right-0 md:items-end"
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
