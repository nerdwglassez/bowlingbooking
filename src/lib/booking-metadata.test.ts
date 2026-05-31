import { describe, expect, it } from 'vitest'

import {
  parseOptionalAddonIds,
  parseShoeSelections,
  serializeShoeSelections,
} from './booking-metadata'

describe('booking-metadata', () => {
  it('round-trips shoe selections', () => {
    const raw = serializeShoeSelections([
      { bowlerId: '1', size: 'M8', cost: 400 },
      { bowlerId: '2', size: 'OWN', cost: 0 },
    ])
    expect(parseShoeSelections(raw)).toEqual([
      { bowlerId: '1', size: 'M8', cost: 0 },
      { bowlerId: '2', size: 'OWN', cost: 0 },
    ])
  })

  it('parses optional add-on ids', () => {
    expect(parseOptionalAddonIds('extra-pitcher, glow-shoes')).toEqual([
      'extra-pitcher',
      'glow-shoes',
    ])
  })
})
