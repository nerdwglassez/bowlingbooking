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
 * Hold countdown bar (`booking-step1-2-branded.html` hold-bar).
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
    label = `Lanes held · ${formatMmSs(remainingMs)} remaining`
  }

  const active = expiresAt != null && !isExpired

  const barClass = isExpired
    ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
    : active
      ? 'border-[var(--status-ok-border)] bg-[var(--status-ok-bg)] text-[var(--status-ok-text)]'
      : 'border-[var(--color-border)] bg-[var(--surface-card)] text-[var(--color-text-muted)]'

  const dotClass = isExpired
    ? 'size-[7px] shrink-0 rounded-full bg-current opacity-70'
    : active
      ? 'size-[7px] shrink-0 animate-[hold-blink_2s_ease-in-out_infinite] rounded-full bg-[var(--status-ok-text)]'
      : 'size-[7px] shrink-0 rounded-full bg-[var(--color-text-muted)]'

  return (
    <div
      className={[
        'mb-4 flex items-center gap-2 rounded-[var(--radius-md)] border px-[13px] py-[9px]',
        barClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className={dotClass} aria-hidden />
      <span className="text-xs font-medium">{label}</span>
    </div>
  )
}
