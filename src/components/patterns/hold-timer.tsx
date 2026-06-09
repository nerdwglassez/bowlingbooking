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
 * Hold countdown bar (`booking-step2-refined.html` hold-bar).
 * Neutral sunken styling; active copy: "Lanes held · MM:SS remaining".
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

  const barClass = isExpired
    ? 'border-[var(--status-error-border)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
    : 'border-[var(--color-border-subtle)] bg-[var(--surface-sunken)] text-[var(--color-text-muted)]'

  const dotClass = isExpired
    ? 'size-[7px] shrink-0 rounded-full bg-current opacity-70'
    : 'size-[7px] shrink-0 animate-[hold-blink_2s_ease-in-out_infinite] rounded-full bg-[var(--color-text-muted)]'

  return (
    <div
      className={[
        'flex items-center gap-2 border-b px-[13px] py-2',
        barClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className={dotClass} aria-hidden />
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  )
}
