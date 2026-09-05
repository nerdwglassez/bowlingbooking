'use client'

import { cx } from '@/lib/cx'
import type { CockpitStats } from '@/lib/actions/staff'

export type CockpitStatHierarchyProps = {
  stats: CockpitStats
}

const CARD =
  'flex flex-col gap-5 rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset'

export function CockpitStatHierarchy({ stats }: CockpitStatHierarchyProps) {
  const lateUrgent = stats.late > 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
      <MetricCard label="Total" value={stats.total} />
      <MetricCard
        label="Upcoming"
        value={stats.upcoming}
        valueClassName="text-brand-secondary"
      />
      <MetricCard
        label="Active"
        value={stats.active}
        valueClassName="text-success-primary"
      />
      <MetricCard label="Done" value={stats.done} />
      <MetricCard
        label="Late"
        value={stats.late}
        valueClassName={lateUrgent ? 'text-error-primary' : undefined}
        hint={lateUrgent ? '5+ min' : 'On time'}
        hintClassName={lateUrgent ? 'text-error-primary' : 'text-tertiary'}
        className={lateUrgent ? 'ring-error' : undefined}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  valueClassName,
  hint,
  hintClassName,
  className,
}: {
  label: string
  value: number
  valueClassName?: string
  hint?: string
  hintClassName?: string
  className?: string
}) {
  return (
    <div className={cx(CARD, className)}>
      <p className="text-md font-medium text-primary">{label}</p>
      <div className="flex flex-col gap-3">
        <p
          className={cx(
            'text-display-sm font-semibold text-primary',
            valueClassName,
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className={cx('text-sm font-medium text-tertiary', hintClassName)}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  )
}
