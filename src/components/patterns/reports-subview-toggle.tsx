'use client'

import type { StaffReportsSubview } from '@/lib/reports-display'

export type ReportsSubviewToggleProps = {
  value: StaffReportsSubview
  onChange: (value: StaffReportsSubview) => void
}

const OPTIONS: { value: StaffReportsSubview; label: string }[] = [
  { value: 'analytics', label: 'Analytics' },
  { value: 'contacts', label: 'Contacts' },
]

export function ReportsSubviewToggle({
  value,
  onChange,
}: ReportsSubviewToggleProps) {
  return (
    <div
      className="flex rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] p-0.5"
      role="tablist"
      aria-label="Reports view"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`flex-1 rounded-[calc(var(--radius-md)-2px)] py-1.5 text-center text-xs font-semibold transition-colors ${
              active
                ? 'bg-[var(--surface-raised)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)]'
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
