import { describe, expect, it } from 'vitest'

import type { Package } from '@/types'

import {
  getPackageIncludedAddons,
  getPackageOptionalAddons,
  optionalAddonLineAmount,
  packageCardTags,
} from './package-addons'
import { calculatePackageStepTotal } from './pricing'

function birthdayPackage(over: Partial<Package> = {}): Package {
  return {
    id: 'pkg-birthday',
    tenantId: 't1',
    name: 'Birthday Party',
    description: 'Party package',
    basePrice: 18500,
    gameIncluded: true,
    shoesIncluded: true,
    gameCostPer: null,
    shoeCostPer: null,
    partyTypes: ['BIRTHDAY'],
    active: true,
    sortOrder: 1,
    ...over,
  }
}

describe('getPackageIncludedAddons', () => {
  it('returns food and drink rows for birthday flat bundles', () => {
    const items = getPackageIncludedAddons(birthdayPackage())
    expect(items.some((i) => i.name.includes('Pizza'))).toBe(true)
    expect(items.some((i) => i.name.includes('pitcher'))).toBe(true)
    expect(items.some((i) => i.lockedTagLabel === 'Food included')).toBe(true)
  })
})

describe('getPackageOptionalAddons', () => {
  it('returns optional catalog for birthday packages', () => {
    const addons = getPackageOptionalAddons(birthdayPackage())
    expect(addons.map((a) => a.id)).toEqual([
      'extra-pitcher',
      'arcade-credits',
      'party-room',
    ])
  })
})

describe('packageCardTags', () => {
  it('includes locked food tag source for birthday packages', () => {
    const { locked } = packageCardTags(birthdayPackage())
    expect(locked).toContain('Food included')
  })
})

describe('calculatePackageStepTotal', () => {
  it('adds selected optional add-on line items', () => {
    const result = calculatePackageStepTotal({
      package: birthdayPackage(),
      bowlerCount: 6,
      selectedOptionalAddonIds: ['extra-pitcher'],
    })
    expect(result.totalAmount).toBe(18500 + 2200)
    expect(result.lineItems.some((item) => item.label === 'Extra pitcher')).toBe(
      true,
    )
  })

  it('scales per-person add-ons by bowler count', () => {
    const pkg = birthdayPackage()
    const addon = getPackageOptionalAddons(pkg).find(
      (a) => a.id === 'arcade-credits',
    )!
    expect(optionalAddonLineAmount(addon, 6)).toBe(6000)
  })
})
