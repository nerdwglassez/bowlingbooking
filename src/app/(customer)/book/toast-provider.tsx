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
import { X } from 'lucide-react'

export type ToastVariant = 'error'

export interface ToastOptions {
  message: string
  variant?: ToastVariant
  durationMs?: number
  dismissible?: boolean
}

interface ToastRecord extends ToastOptions {
  id: string
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord
  onDismiss: (id: string) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (toast.durationMs == null || toast.durationMs <= 0) return
    timerRef.current = setTimeout(() => onDismiss(toast.id), toast.durationMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.durationMs, toast.id, onDismiss])

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-dark)] px-4 py-3 text-[var(--color-text-inverted)] shadow-[var(--shadow-lg)]"
    >
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--status-error-bg)] text-[var(--status-error-text)]"
        aria-hidden
      >
        <X className="size-3.5" strokeWidth={2.5} />
      </span>
      <p className="min-w-0 flex-1 text-sm leading-snug">{toast.message}</p>
      {toast.dismissible !== false ? (
        <button
          type="button"
          className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-inverted)]"
          aria-label="Dismiss"
          onClick={() => onDismiss(toast.id)}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((options: ToastOptions) => {
    setToasts((prev) => [...prev, { ...options, id: crypto.randomUUID() }])
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full max-w-md">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return ctx
}
