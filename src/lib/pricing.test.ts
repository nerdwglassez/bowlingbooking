import { describe, expect, it } from 'vitest'

import type { Package } from '@/types'
import { calculateBookingTotal, calculatePrice, formatPrice } from './pricing'

function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: 'pkg-test',
    tenantId: 'tenant-test',
    name: 'Test Package',
    description: null,
    basePrice: 3600,
    gameIncluded: true,
    shoesIncluded: true,
    gameCostPer: null,
    shoeCostPer: null,
    partyTypes: ['OPEN'],
    active: true,
    sortOrder: 1,
    ...overrides,
  }
}

describe('calculatePrice', () => {
  describe('when games and shoes are included', () => {
    it('charges only the base price', () => {
      const result = calculatePrice({
        package: makePackage({ basePrice: 3600 }),
        bowlerCount: 4,
      })

      expect(result.baseAmount).toBe(3600)
      expect(result.gameAmount).toBe(0)
      expect(result.shoeAmount).toBe(0)
      expect(result.totalAmount).toBe(3600)
      expect(result.lineItems).toHaveLength(1)
      expect(result.lineItems[0]).toMatchObject({
        type: 'base',
        amount: 3600,
      })
    })

    it('does not scale with bowler count', () => {
      const result1 = calculatePrice({
        package: makePackage(),
        bowlerCount: 1,
      })
      const result10 = calculatePrice({
        package: makePackage(),
        bowlerCount: 10,
      })

      expect(result1.totalAmount).toBe(result10.totalAmount)
    })
  })

  describe('when games and shoes are paid extras', () => {
    const payPerGame = makePackage({
      basePrice: 1200,
      gameIncluded: false,
      shoesIncluded: false,
      gameCostPer: 800,
      shoeCostPer: 500,
    })

    it('charges base + (games per bowler × game cost) + (shoes × bowlers)', () => {
      const result = calculatePrice({
        package: payPerGame,
        bowlerCount: 4,
      })

      expect(result.baseAmount).toBe(1200)
      expect(result.gameAmount).toBe(6400)
      expect(result.shoeAmount).toBe(2000)
      expect(result.totalAmount).toBe(9600)
    })

    it('honors a custom gamesPerBowler', () => {
      const result = calculatePrice({
        package: payPerGame,
        bowlerCount: 4,
        gamesPerBowler: 3,
      })

      expect(result.gameAmount).toBe(800 * 4 * 3)
      expect(result.totalAmount).toBe(1200 + 800 * 4 * 3 + 500 * 4)
    })

    it('emits a line item for each non-zero extra', () => {
      const result = calculatePrice({
        package: payPerGame,
        bowlerCount: 4,
      })

      expect(result.lineItems.map((li) => li.type)).toEqual([
        'base',
        'game',
        'shoe',
      ])
    })
  })

  describe('partial inclusion', () => {
    it('skips the game line item when gameIncluded is true even if gameCostPer is set', () => {
      const result = calculatePrice({
        package: makePackage({
          gameIncluded: true,
          gameCostPer: 999,
          shoesIncluded: false,
          shoeCostPer: 500,
        }),
        bowlerCount: 4,
      })

      expect(result.gameAmount).toBe(0)
      expect(result.lineItems.find((li) => li.type === 'game')).toBeUndefined()
      expect(result.shoeAmount).toBe(2000)
    })

    it('skips the shoe line item when shoeCostPer is null even if shoesIncluded is false', () => {
      const result = calculatePrice({
        package: makePackage({
          shoesIncluded: false,
          shoeCostPer: null,
        }),
        bowlerCount: 4,
      })

      expect(result.shoeAmount).toBe(0)
      expect(result.lineItems.find((li) => li.type === 'shoe')).toBeUndefined()
    })
  })

  it('all monetary fields stay in integer cents (no floating-point drift)', () => {
    const result = calculatePrice({
      package: makePackage({
        basePrice: 1799,
        gameIncluded: false,
        gameCostPer: 333,
        shoesIncluded: false,
        shoeCostPer: 167,
      }),
      bowlerCount: 7,
    })

    for (const value of [
      result.baseAmount,
      result.gameAmount,
      result.shoeAmount,
      result.totalAmount,
    ]) {
      expect(Number.isInteger(value)).toBe(true)
    }
  })
})

describe('calculateBookingTotal — lane strategy', () => {
  const start = new Date('2026-06-01T18:00:00')
  const end = new Date('2026-06-01T20:00:00')

  it('uses per_person_hour rate × bowlers × duration', () => {
    const result = calculateBookingTotal({
      package: null,
      bowlerCount: 4,
      laneCount: 1,
      shoeSelections: [],
      shoeRentalPriceCents: 400,
      laneReservationCents: 2400,
      pricingContext: {
        strategy: 'per_person_hour',
        rateCents: 1500,
        startTime: start,
        endTime: end,
      },
    })
    expect(result.totalAmount).toBe(12000)
  })

  it('uses per_lane_hour rate × lanes × duration', () => {
    const result = calculateBookingTotal({
      package: null,
      bowlerCount: 7,
      laneCount: 2,
      shoeSelections: [],
      shoeRentalPriceCents: 400,
      laneReservationCents: 4800,
      pricingContext: {
        strategy: 'per_lane_hour',
        rateCents: 2000,
        startTime: start,
        endTime: end,
      },
    })
    expect(result.totalAmount).toBe(8000)
  })

  it('falls back to flat lane fee when no pricingContext', () => {
    const result = calculateBookingTotal({
      package: null,
      bowlerCount: 4,
      laneCount: 2,
      shoeSelections: [],
      shoeRentalPriceCents: 400,
      laneReservationCents: 3000,
    })
    expect(result.totalAmount).toBe(3000)
  })
})

describe('formatPrice', () => {
  it('renders integer cents as USD with two decimals', () => {
    expect(formatPrice(4500)).toBe('$45.00')
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(99)).toBe('$0.99')
  })

  it('handles large amounts', () => {
    expect(formatPrice(123456)).toBe('$1,234.56')
  })
})
