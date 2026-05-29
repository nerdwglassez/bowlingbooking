'use client'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  OWN_SHOES_VALUE,
  shoeSizeOptionGroups,
} from '@/lib/shoe-sizes'

export type ShoeSizeRowProps = {
  bowlerIndex: number
  size: string
  shoeRentalPriceCents: number
  canRemove: boolean
  onSizeChange: (size: string, cost: number) => void
  onRemove: () => void
}

export function ShoeSizeRow({
  bowlerIndex,
  size,
  shoeRentalPriceCents,
  canRemove,
  onSizeChange,
  onRemove,
}: ShoeSizeRowProps) {
  const groups = shoeSizeOptionGroups()

  function handleChange(next: string) {
    const cost = next === OWN_SHOES_VALUE || next === '' ? 0 : shoeRentalPriceCents
    onSizeChange(next, cost)
  }

  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border)] py-2 last:border-b-0">
      <span className="w-20 shrink-0 text-sm font-medium text-[var(--color-text-primary)]">
        Bowler {bowlerIndex + 1}
      </span>
      <Select
        value={size}
        onChange={(e) => handleChange(e.target.value)}
        className="min-w-0 flex-1"
        aria-label={`Shoe size for bowler ${bowlerIndex + 1}`}
      >
        <option value="">Select size</option>
        {groups.map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove bowler ${bowlerIndex + 1}`}
          onClick={onRemove}
        >
          Remove
        </Button>
      ) : (
        <span className="w-[4.5rem] shrink-0" aria-hidden />
      )}
    </div>
  )
}
