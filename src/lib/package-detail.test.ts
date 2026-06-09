import { describe, expect, it } from 'vitest'

import {
  getPackageCardPrice,
  isLaneOnlyDefaultPackage,
  packageInclusionItems,
  packageInclusionLines,
  packageSummaryTags,
} from './package-detail'
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

describe('getPackageCardPrice', () => {
  it('uses flat clarifier for bundled packages', () => {
    const price = getPackageCardPrice(
      basePkg({
        basePrice: 18500,
        gameIncluded: true,
        shoesIncluded: true,
        gameCostPer: null,
      }),
    )
    expect(price).toEqual({ amountCents: 18500, clarifier: 'flat' })
  })

  it('uses per-hour clarifier for rate-based packages', () => {
    const price = getPackageCardPrice(
      basePkg({ basePrice: 1200, gameIncluded: false }),
    )
    expect(price).toEqual({ amountCents: 1200, clarifier: '/ person / hr' })
  })
})

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

describe('packageInclusionItems', () => {
  it('assigns shoe icon for shoe rental lines', () => {
    const items = packageInclusionItems(
      basePkg({ shoesIncluded: true, gameIncluded: true }),
    )
    expect(items.some((item) => item.icon === 'shoes')).toBe(true)
  })
})

describe('isLaneOnlyDefaultPackage', () => {
  it('matches tenant open-bowling default row', () => {
    expect(
      isLaneOnlyDefaultPackage(
        basePkg({
          name: 'Open Bowling',
          basePrice: 0,
          gameIncluded: false,
          shoesIncluded: false,
          partyTypes: ['OPEN'],
        }),
      ),
    ).toBe(true)
  })

  it('does not match priced open packages', () => {
    expect(
      isLaneOnlyDefaultPackage(
        basePkg({ basePrice: 1200, partyTypes: ['OPEN'] }),
      ),
    ).toBe(false)
  })
})
