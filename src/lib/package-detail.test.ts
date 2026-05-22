import { describe, expect, it } from 'vitest'

import { packageInclusionLines, packageSummaryTags } from './package-detail'
import type { Package } from '@/types'

function basePkg(over: Partial<Package> = {}): Package {
  return {
    id: 'p1',
    tenantId: 't1',
    name: 'Test',
    description: 'Short desc',
    basePrice: 1000,
    gameIncluded: false,
    shoesIncluded: false,
    gameCostPer: null,
    shoeCostPer: null,
    partyTypes: ['OPEN'],
    active: true,
    sortOrder: 0,
    ...over,
  }
}

describe('packageSummaryTags', () => {
  it('includes shoes and games when flagged', () => {
    const tags = packageSummaryTags(
      basePkg({ shoesIncluded: true, gameIncluded: true }),
    )
    expect(tags).toContain('Shoes included')
    expect(tags).toContain('Games included')
  })
})

describe('packageInclusionLines', () => {
  it('falls back when no game or shoe rules apply', () => {
    const lines = packageInclusionLines(
      basePkg({
        gameIncluded: false,
        shoesIncluded: false,
        gameCostPer: null,
        shoeCostPer: null,
      }),
    )
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })
})
