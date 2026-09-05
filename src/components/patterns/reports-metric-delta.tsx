import { TrendDown01, TrendUp01 } from '@untitledui/icons'

import type { StaffMetricDelta } from '@/lib/reports-display'
import { formatDeltaPercent } from '@/lib/reports-display'
import { cx } from '@/lib/cx'

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
      <span className="text-sm font-medium text-tertiary">No change</span>
    )
  }

  const isUp = delta.direction === 'up'
  const positive = invertColors ? !isUp : isUp
  const Icon = isUp ? TrendUp01 : TrendDown01

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Icon
          className={cx(
            'size-4 stroke-[3px]',
            positive ? 'text-fg-success-secondary' : 'text-fg-error-secondary',
          )}
          aria-hidden
        />
        <span
          className={cx(
            'text-sm font-medium',
            positive ? 'text-success-primary' : 'text-error-primary',
          )}
        >
          {formatDeltaPercent(delta)}
        </span>
      </div>
      {showLabel ? (
        <span className="text-sm font-medium text-tertiary">
          {delta.comparisonLabel}
        </span>
      ) : null}
    </div>
  )
}
