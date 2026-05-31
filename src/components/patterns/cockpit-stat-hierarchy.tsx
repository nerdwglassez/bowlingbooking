'use client'

// CockpitStatHierarchy — parent Total + 2×2 children (staff-stat-hierarchy.html).

import type { CockpitStats } from '@/lib/actions/staff'

export type CockpitStatHierarchyProps = {
  stats: CockpitStats
}

export function CockpitStatHierarchy({ stats }: CockpitStatHierarchyProps) {
  const lateUrgent = stats.late > 0

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="flex min-w-[80px] shrink-0 flex-col justify-center rounded-[var(--radius-md)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-card)] px-4 py-3.5">
        <div className="text-[36px] leading-none [font-family:var(--font-display)] text-[var(--color-text-primary)]">
          {stats.total}
        </div>
        <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Total
        </div>
      </div>

      <div className="flex shrink-0 items-center px-0.5" aria-hidden>
        <div className="h-12 w-px rounded-full bg-[var(--color-border-strong)]" />
      </div>

      <div className="grid flex-1 grid-cols-2 gap-1.5">
        <ChildStat
          label="Upcoming"
          value={stats.upcoming}
          valueClass="text-[var(--color-action-dark)]"
        />
        <ChildStat
          label="Active"
          value={stats.active}
          valueClass="text-[var(--status-error-text)]"
        />
        <ChildStat
          label="Done"
          value={stats.done}
          valueClass="text-[var(--color-text-secondary)]"
        />
        <LateChildStat value={stats.late} urgent={lateUrgent} />
      </div>
    </div>
  )
}

function ChildStat({
  label,
  value,
  valueClass,
}: {
  label: string
  value: number
  valueClass?: string
}) {
  return (
    <div className="flex flex-col rounded-[var(--radius-sm)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] px-2.5 py-2">
      <div
        className={`text-xl leading-none [font-family:var(--font-display)] text-[var(--color-text-primary)] ${valueClass ?? ''}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </div>
    </div>
  )
}

function LateChildStat({
  value,
  urgent,
}: {
  value: number
  urgent: boolean
}) {
  return (
    <div
      className={`flex flex-col rounded-[var(--radius-sm)] border border-solid px-2.5 py-2 ${
        urgent
          ? 'border-[color-mix(in_srgb,var(--status-error-border)_25%,transparent)] bg-[color-mix(in_srgb,var(--status-error-bg)_7%,transparent)]'
          : 'border-[var(--color-border)] bg-[var(--surface-card)]'
      }`}
    >
      <div
        className={`text-xl leading-none [font-family:var(--font-display)] ${
          urgent
            ? 'text-[var(--status-error-text)]'
            : 'text-[var(--color-text-secondary)]'
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1 text-[9px] font-semibold uppercase tracking-wide ${
          urgent
            ? 'text-[color-mix(in_srgb,var(--status-error-text)_60%,transparent)]'
            : 'text-[var(--color-text-secondary)]'
        }`}
      >
        Late
      </div>
      {urgent ? (
        <div className="mt-0.5 flex items-center gap-1">
          <span
            className="size-[5px] shrink-0 animate-pulse rounded-full bg-[var(--status-error-text)]"
            aria-hidden
          />
          <span className="text-[9px] font-semibold text-[var(--status-error-text)]">
            5+ min
          </span>
        </div>
      ) : null}
    </div>
  )
}
