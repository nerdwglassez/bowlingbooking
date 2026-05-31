'use client'

// CockpitSearchBar — collapsed by default, expands on tap (staff-stat-hierarchy.html).

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

export type CockpitSearchBarProps = {
  value: string
  onChange: (value: string) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  placeholder?: string
}

export function CockpitSearchBar({
  value,
  onChange,
  expanded,
  onExpandedChange,
  placeholder = 'Search by name, phone, or code…',
}: CockpitSearchBarProps) {
  if (!expanded && !value) {
    return (
      <button
        type="button"
        className="flex items-center gap-1.5 py-2 opacity-40"
        onClick={() => onExpandedChange(true)}
        aria-label="Search bookings"
      >
        <Search
          className="size-3.5 shrink-0 text-[var(--color-text-secondary)]"
          aria-hidden
        />
        <span className="text-xs text-[var(--color-text-secondary)]">
          Search bookings…
        </span>
      </button>
    )
  }

  return (
    <div className="relative flex items-center gap-2 rounded-[var(--radius-md)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-card)] px-3 py-2.5 focus-within:border-[var(--color-border-strong)]">
      <Search
        className="size-3.5 shrink-0 text-[var(--color-text-secondary)]"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-auto min-h-0 flex-1 border-0 bg-transparent p-0 text-[13px] shadow-none focus-visible:ring-0"
        aria-label="Search bookings"
        autoFocus
      />
      <button
        type="button"
        className="shrink-0 text-xs font-semibold text-[var(--color-action)]"
        onClick={() => {
          onChange('')
          onExpandedChange(false)
        }}
      >
        Cancel
      </button>
    </div>
  )
}
