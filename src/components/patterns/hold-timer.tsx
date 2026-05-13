// hold-timer.tsx — Documented exception to PATTERNS.md §2 rule 7.
//
// Subscribes to wall-clock time via the shared useWallClockNow helper rather
// than maintaining its own interval. No useState — the timer value is an
// external subscription, not component state. See PATTERNS.md §2 rule 7.

'use client'

import { useEffect, useRef } from 'react'
import { useWallClockNow } from '@/lib/use-wall-clock'

const WARNING_MS = 120_000

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
}

export function HoldTimer({ expiresAt, onExpire, className }: HoldTimerProps) {
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

  let pillClass: string
  let dotClass: string
  let label: string

  if (expiresAt == null) {
    pillClass =
      'inline-flex items-center gap-2 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]'
    dotClass = 'size-1.5 shrink-0 rounded-full bg-current opacity-70'
    label = 'Select a time to hold your lanes'
  } else if (isExpired) {
    pillClass =
      'inline-flex items-center gap-2 rounded-full border border-[var(--status-error-border)] bg-[var(--status-error-bg)] px-3 py-1 text-xs font-medium text-[var(--status-error-text)]'
    dotClass = 'size-1.5 shrink-0 rounded-full bg-current opacity-70'
    label = 'Hold expired — pick a new time'
  } else {
    const remainingMs = expiresAt.getTime() - now
    const mmSs = formatMmSs(remainingMs)
    label = `Lanes held · ${mmSs} remaining`
    const isWarning = remainingMs <= WARNING_MS
    if (isWarning) {
      pillClass =
        'inline-flex items-center gap-2 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-1 text-xs font-medium text-[var(--status-warning-text)]'
      dotClass =
        'size-1.5 shrink-0 animate-pulse rounded-full bg-[var(--status-warning-text)]'
    } else {
      pillClass =
        'inline-flex items-center gap-2 rounded-full border border-[var(--status-ok-border)] bg-[var(--status-ok-bg)] px-3 py-1 text-xs font-medium text-[var(--status-ok-text)]'
      dotClass =
        'size-1.5 shrink-0 rounded-full bg-[var(--status-ok-text)]'
    }
  }

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
