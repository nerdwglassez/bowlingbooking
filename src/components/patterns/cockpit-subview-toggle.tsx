'use client'

// CockpitSubviewToggle — Overview | Lanes pill (staff-app-v2.html).

import type { CockpitSubview } from '@/lib/cockpit-display'

export type CockpitSubviewToggleProps = {
  value: CockpitSubview
  onChange: (value: CockpitSubview) => void
}

const OPTIONS: { value: CockpitSubview; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'lanes', label: 'Lanes' },
]

export function CockpitSubviewToggle({
  value,
  onChange,
}: CockpitSubviewToggleProps) {
  return (
    <div
      className="flex rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-card)] p-0.5"
      role="tablist"
      aria-label="Cockpit view"
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
                : 'text-[var(--color-text-secondary)]'
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
