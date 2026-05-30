'use client'

import { Select } from '@/components/ui/select'
import { formatPrice } from '@/lib/pricing'
import {
  OWN_SHOES_VALUE,
  shoeSizeOptionGroups,
} from '@/lib/shoe-sizes'
import type { ShoeSelection } from '@/types'

export type ShoeRentalTableProps = {
  selections: ShoeSelection[]
  shoeRentalPriceCents: number
  onSizeChange: (index: number, size: string, cost: number) => void
  allComplete?: boolean
  className?: string
}

function selectStateClass(size: string): string {
  if (size.length === 0) {
    return 'text-[var(--color-text-muted)] bg-[var(--surface-card)] border-[var(--color-border)]'
  }
  if (size === OWN_SHOES_VALUE) {
    return 'text-[var(--color-text-muted)] bg-[var(--surface-sunken)] border-[var(--color-border)]'
  }
  return 'text-[var(--color-text-primary)] bg-[var(--surface-card)] border-[var(--color-border-strong)]'
}

export function ShoeRentalTable({
  selections,
  shoeRentalPriceCents,
  onSizeChange,
  allComplete = false,
  className,
}: ShoeRentalTableProps) {
  const groups = shoeSizeOptionGroups()
  const flatOptions = groups.flatMap((group) => group.options)

  function handleChange(index: number, next: string) {
    const cost =
      next === OWN_SHOES_VALUE || next === '' ? 0 : shoeRentalPriceCents
    onSizeChange(index, next, cost)
  }

  return (
    <div
      className={[
        'overflow-hidden rounded-[var(--radius-lg)] border-[1.5px]',
        allComplete
          ? 'border-[var(--color-action)] shadow-[0_0_0_3px_var(--color-action-subtle)]'
          : 'border-[var(--color-border)]',
        'bg-[var(--surface-card)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="grid grid-cols-[1fr_10rem] gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Guest
        </span>
        <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
          Shoe size
        </span>
      </div>

      <div className="px-3 py-1">
        {selections.map((row, index) => (
          <div
            key={row.bowlerId}
            className="grid grid-cols-[1fr_10rem] items-center gap-2 border-b border-[var(--color-border-subtle)] py-2 last:border-b-0"
          >
            <div>
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                Guest {index + 1}
              </p>
            </div>
            <Select
              value={row.size}
              onChange={(e) => handleChange(index, e.target.value)}
              selectSize="sm"
              className={selectStateClass(row.size)}
              aria-label={`Shoe size for guest ${index + 1}`}
            >
              <option value="">Select size</option>
              <option value={OWN_SHOES_VALUE}>── Own shoes</option>
              {flatOptions
                .filter((opt) => opt.value !== OWN_SHOES_VALUE)
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}

export type ShoeRentalSectionHeaderProps = {
  shoeRentalPriceCents: number
  className?: string
}

export function ShoeRentalSectionHeader({
  shoeRentalPriceCents,
  className,
}: ShoeRentalSectionHeaderProps) {
  return (
    <div
      className={[
        'flex items-baseline justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-muted)]">
        Shoe rental
      </h2>
      <span className="text-[11px] text-[var(--color-text-muted)]">
        {formatPrice(shoeRentalPriceCents)} / person
      </span>
    </div>
  )
}
