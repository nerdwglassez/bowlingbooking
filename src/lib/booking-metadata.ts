import type { ShoeSelection } from '@/types'

/** Compact shoe metadata for Stripe PaymentIntent (index:size pairs). */
export function serializeShoeSelections(
  selections: ShoeSelection[],
): string {
  return selections
    .map((row, index) => `${index}:${row.size || '_'}`)
    .join(',')
}

export function parseShoeSelections(raw: string | undefined): ShoeSelection[] {
  if (!raw?.trim()) return []
  return raw.split(',').map((part, index) => {
    const colon = part.indexOf(':')
    if (colon === -1) {
      return { bowlerId: String(index + 1), size: part, cost: 0 }
    }
    const size = part.slice(colon + 1)
    return {
      bowlerId: String(index + 1),
      size: size === '_' ? '' : size,
      cost: 0,
    }
  })
}

export function parseOptionalAddonIds(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}
