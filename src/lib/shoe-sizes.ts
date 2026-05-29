// shoe-sizes.ts — Shoe size options for booking Step 3.

export const OWN_SHOES_VALUE = 'OWN'

export interface ShoeSizeOption {
  value: string
  label: string
  group: string
}

const YOUTH_SIZES = ['1', '2', '3', '4', '5', '5.5', '6', '6.5', '7', '7.5', '8']

function womensSizes(): ShoeSizeOption[] {
  return Array.from({ length: 8 }, (_, i) => {
    const size = i + 5
    return {
      value: `W${size}`,
      label: `Women's ${size}`,
      group: 'Youth & Women',
    }
  })
}

function mensSizes(): ShoeSizeOption[] {
  return Array.from({ length: 10 }, (_, i) => {
    const size = i + 6
    return {
      value: `M${size}`,
      label: `Men's ${size}`,
      group: 'Men',
    }
  })
}

function youthSizes(): ShoeSizeOption[] {
  return YOUTH_SIZES.map((size) => ({
    value: `Y${size}`,
    label: size,
    group: 'Youth & Women',
  }))
}

/** Flat list with group labels suitable for <optgroup>. */
export function shoeSizeOptionGroups(): Array<{
  group: string
  options: ShoeSizeOption[]
}> {
  return [
    {
      group: 'Youth & Women',
      options: [
        { value: OWN_SHOES_VALUE, label: 'Own shoes', group: 'Youth & Women' },
        ...youthSizes(),
        ...womensSizes(),
      ],
    },
    {
      group: 'Men',
      options: mensSizes(),
    },
  ]
}

export function shoeSizeLabel(value: string): string {
  if (value === OWN_SHOES_VALUE) return 'Own shoes'
  for (const group of shoeSizeOptionGroups()) {
    const match = group.options.find((o) => o.value === value)
    if (match) return match.label
  }
  return value
}
