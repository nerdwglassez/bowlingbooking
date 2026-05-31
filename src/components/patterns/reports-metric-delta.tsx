import { TrendingDown, TrendingUp } from 'lucide-react'

import type { StaffMetricDelta } from '@/lib/reports-display'
import { formatDeltaPercent } from '@/lib/reports-display'

export type ReportsMetricDeltaProps = {
  delta: StaffMetricDelta
  /** When false, omit the comparison label (e.g. bookings card). */
  showLabel?: boolean
  invertColors?: boolean
}

export function ReportsMetricDelta({
  delta,
  showLabel = false,
  invertColors = false,
}: ReportsMetricDeltaProps) {
  if (delta.direction === 'flat') {
    return (
      <span className="text-[10px] text-[var(--color-text-muted)]">
        No change
      </span>
    )
  }

  const isUp = delta.direction === 'up'
  const positive = invertColors ? !isUp : isUp
  const colorClass = positive
    ? 'text-[var(--status-ok-text)]'
    : 'text-[var(--status-error-text)]'

  const Icon = isUp ? TrendingUp : TrendingDown

  return (
    <div className="mt-1 flex items-center gap-1">
      <Icon className={`size-2.5 ${colorClass}`} aria-hidden />
      <span className={`text-[10px] font-semibold ${colorClass}`}>
        {formatDeltaPercent(delta)}
      </span>
      {showLabel ? (
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {delta.comparisonLabel}
        </span>
      ) : null}
    </div>
  )
}
