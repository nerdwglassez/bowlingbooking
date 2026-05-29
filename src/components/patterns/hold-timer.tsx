// hold-timer.tsx — Documented exception to PATTERNS.md §2 rule 7.
//
// Subscribes to wall-clock time via the shared useWallClockNow helper rather
// than maintaining its own interval. No useState — the timer value is an
// external subscription, not component state. See PATTERNS.md §2 rule 7.

'use client'

import { useEffect, useRef } from 'react'
import { useWallClockNow } from '@/lib/use-wall-clock'

function formatMmSs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export type HoldTimerProps = {
  expiresAt: Date | null
  onExpire?: () => void
  className?: string
  /** When false, render nothing until a hold exists (Step 1 after slot select). */
  showWhenIdle?: boolean
}

/**
 * Amber hold countdown per BOOKING_INTERACTIONS.md — never green (confirmed).
 */
export function HoldTimer({
  expiresAt,
  onExpire,
  className,
  showWhenIdle = true,
}: HoldTimerProps) {
  const now = useWallClockNow()
  const expireFiredRef = useRef(false)

  useEffect(() => {
    expireFiredRef.current = false
  }, [expiresAt])

  const isExpired =
    expiresAt != null && expiresAt.getTime() <= now

  useEffect(() => {
    if (!expiresAt || !isExpired || !onExpire || expireFiredRef.current) return
    expireFiredRef.current = true
    onExpire()
  }, [expiresAt, isExpired, onExpire])

  if (!showWhenIdle && expiresAt == null) {
    return null
  }

  let label: string
  if (expiresAt == null) {
    label = 'Select a time to hold your lanes'
  } else if (isExpired) {
    label = 'Hold expired — pick a new time'
  } else {
    const remainingMs = expiresAt.getTime() - now
    label = `Hold expires in ${formatMmSs(remainingMs)}`
  }

  const pillClass =
    expiresAt != null && !isExpired
      ? 'inline-flex items-center gap-2 rounded-full border border-[var(--color-action)] bg-[var(--color-action-subtle)] px-3 py-1 text-xs font-medium text-[var(--color-action-text)]'
      : isExpired
        ? 'inline-flex items-center gap-2 rounded-full border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-1 text-xs font-medium text-[var(--status-error-text)]'
        : 'inline-flex items-center gap-2 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]'

  const dotClass =
    expiresAt != null && !isExpired
      ? 'size-1.5 shrink-0 rounded-full bg-[var(--color-action)] motion-safe:animate-pulse'
      : 'size-1.5 shrink-0 rounded-full bg-current opacity-70'

  return (
    <div
      className={[pillClass, className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className={dotClass} aria-hidden />
      <span>{label}</span>
    </div>
  )
}
