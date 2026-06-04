// ============================================================
// pricing.ts — Package price calculation
//
// Pricing resolves from package flags (gameIncluded, shoesIncluded).
// Never hardcode prices in UI components.
// Always call calculatePrice() and render the result.
// ============================================================

import type { Package, PricingResult, LineItem, ShoeSelection } from '@/types'

import {
  getPackageOptionalAddons,
  optionalAddonLineAmount,
} from '@/lib/package-addons'
import { rateBasedTotalCents } from '@/lib/pricing-period'
import { bookingDurationHours } from '@/lib/tenant'
import type {
  LanePricingContext,
  TenantPricingStrategy,
} from '@/lib/tenant-pricing'

export type BookingPricingContext = LanePricingContext

interface PricingInput {
  package: Package
  bowlerCount: number
  gamesPerBowler?: number
}

export interface BookingTotalInput {
  package: Package | null
  bowlerCount: number
  laneCount: number
  shoeSelections?: ShoeSelection[]
  shoeRentalPriceCents: number
  laneReservationCents?: number
  gamesPerBowler?: number
  selectedOptionalAddonIds?: string[]
  /** When set, lane-only totals use strategy + period rate instead of flat lane fee. */
  pricingContext?: BookingPricingContext
}

function calculateStrategyLaneTotal(input: {
  strategy: TenantPricingStrategy
  bowlerCount: number
  laneCount: number
  startTime: Date
  endTime: Date
  rateCents: number
  gamesPerBowler: number
}): PricingResult {
  const {
    strategy,
    bowlerCount,
    laneCount,
    startTime,
    endTime,
    rateCents,
    gamesPerBowler,
  } = input
  const hours = bookingDurationHours(startTime, endTime)

  let amount = 0
  let label = 'Lane reservation'

  switch (strategy) {
    case 'per_lane_hour':
      amount = Math.round(rateCents * laneCount * hours)
      label =
        laneCount === 1
          ? `Lane · ${hours.toFixed(1)} hr`
          : `${laneCount} lanes · ${hours.toFixed(1)} hr`
      break
    case 'per_person_game':
      amount = Math.round(rateCents * bowlerCount * gamesPerBowler)
      label = `Bowling · ${bowlerCount} × ${gamesPerBowler} games`
      break
    case 'per_person_hour':
      amount = rateBasedTotalCents({
        bowlerCount,
        durationMins: Math.round(hours * 60),
        ratePerPersonPerHour: rateCents,
      })
      label = `Bowling · ${bowlerCount} bowlers · ${hours.toFixed(1)} hr`
      break
    case 'packages_only':
    default:
      amount = Math.round(rateCents * laneCount)
      label = laneCount === 1 ? 'Lane reservation' : `${laneCount} lanes`
      break
  }

  return {
    baseAmount: amount,
    gameAmount: 0,
    shoeAmount: 0,
    totalAmount: amount,
    lineItems: [{ label, amount, type: 'base' }],
  }
}

/**
 * Calculate the full price breakdown for a booking.
 * All monetary amounts in the result and on `Package` are **integer cents** (e.g. 4500 = $45.00).
 * Returns line items suitable for rendering in the price footer.
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const { package: pkg, bowlerCount, gamesPerBowler = 2 } = input
  const lineItems: LineItem[] = []

  lineItems.push({
    label: pkg.name,
    amount: pkg.basePrice,
    type: 'base',
  })

  let gameAmount = 0
  if (!pkg.gameIncluded && pkg.gameCostPer != null) {
    gameAmount = pkg.gameCostPer * bowlerCount * gamesPerBowler
    lineItems.push({
      label: `Games (${bowlerCount} × ${gamesPerBowler})`,
      amount: gameAmount,
      type: 'game',
    })
  }

  let shoeAmount = 0
  if (!pkg.shoesIncluded && pkg.shoeCostPer != null) {
    shoeAmount = pkg.shoeCostPer * bowlerCount
    lineItems.push({
      label: `Shoe rental (${bowlerCount})`,
      amount: shoeAmount,
      type: 'shoe',
    })
  }

  const totalAmount = pkg.basePrice + gameAmount + shoeAmount

  return {
    baseAmount: pkg.basePrice,
    gameAmount,
    shoeAmount,
    totalAmount,
    lineItems,
  }
}

export interface PackageStepTotalInput {
  package: Package
  bowlerCount: number
  selectedOptionalAddonIds?: string[]
  gamesPerBowler?: number
}

/**
 * Step 2 total: package base + selected optional add-ons (wireframe 2d footer).
 */
export function calculatePackageStepTotal(
  input: PackageStepTotalInput,
): PricingResult {
  const {
    package: pkg,
    bowlerCount,
    selectedOptionalAddonIds = [],
    gamesPerBowler = 2,
  } = input

  const base = calculatePrice({ package: pkg, bowlerCount, gamesPerBowler })
  const catalog = getPackageOptionalAddons(pkg)
  const selected = catalog.filter((addon) =>
    selectedOptionalAddonIds.includes(addon.id),
  )

  if (selected.length === 0) {
    return base
  }

  const lineItems: LineItem[] = [...base.lineItems]
  let addonTotal = 0

  for (const addon of selected) {
    const amount = optionalAddonLineAmount(addon, bowlerCount)
    lineItems.push({
      label: addon.name,
      amount,
      type: 'addon',
    })
    addonTotal += amount
  }

  return {
    baseAmount: base.baseAmount,
    gameAmount: base.gameAmount,
    shoeAmount: base.shoeAmount,
    totalAmount: base.totalAmount + addonTotal,
    lineItems,
  }
}

/**
 * Booking-flow total: optional package + per-bowler shoe selections from Step 3.
 */
export function calculateBookingTotal(input: BookingTotalInput): PricingResult {
  const {
    package: pkg,
    bowlerCount,
    laneCount,
    shoeSelections = [],
    laneReservationCents = 0,
    gamesPerBowler = 2,
  } = input

  if (pkg != null) {
    const base = calculatePackageStepTotal({
      package: pkg,
      bowlerCount,
      selectedOptionalAddonIds: input.selectedOptionalAddonIds ?? [],
      gamesPerBowler,
    })
    if (pkg.shoesIncluded || shoeSelections.length === 0) {
      return base
    }

    const lineItems = base.lineItems.filter((item) => item.type !== 'shoe')
    let shoeAmount = 0
    shoeSelections.forEach((sel, index) => {
      const amount = shoeSelectionAmount(sel, input.shoeRentalPriceCents)
      lineItems.push({
        label:
          sel.size === 'OWN'
            ? `Bowler ${index + 1} · Own shoes`
            : `Bowler ${index + 1} · Shoes`,
        amount,
        type: 'shoe',
      })
      shoeAmount += amount
    })

    const totalAmount =
      base.baseAmount + base.gameAmount + shoeAmount

    return {
      baseAmount: base.baseAmount,
      gameAmount: base.gameAmount,
      shoeAmount,
      totalAmount,
      lineItems,
    }
  }

  if (input.pricingContext && input.pricingContext.strategy !== 'packages_only') {
    const strategyBase = calculateStrategyLaneTotal({
      strategy: input.pricingContext.strategy,
      bowlerCount,
      laneCount,
      startTime: input.pricingContext.startTime,
      endTime: input.pricingContext.endTime,
      rateCents: input.pricingContext.rateCents,
      gamesPerBowler,
    })
    return appendShoeLinesToLaneTotal(
      strategyBase,
      shoeSelections,
      input.shoeRentalPriceCents,
    )
  }

  const lineItems: LineItem[] = []
  if (laneReservationCents > 0) {
    lineItems.push({
      label: laneCount === 1 ? 'Lane reservation' : `${laneCount} lanes`,
      amount: laneReservationCents,
      type: 'base',
    })
  }

  return appendShoeLinesToLaneTotal(
    {
      baseAmount: laneReservationCents,
      gameAmount: 0,
      shoeAmount: 0,
      totalAmount: laneReservationCents,
      lineItems,
    },
    shoeSelections,
    input.shoeRentalPriceCents,
  )
}

function shoeSelectionAmount(
  selection: ShoeSelection,
  shoeRentalPriceCents: number,
): number {
  if (selection.size === 'OWN' || selection.size.length === 0) return 0
  return shoeRentalPriceCents
}

function appendShoeLinesToLaneTotal(
  base: PricingResult,
  shoeSelections: ShoeSelection[],
  shoeRentalPriceCents: number,
): PricingResult {
  if (shoeSelections.length === 0) return base

  const lineItems = [...base.lineItems]
  let shoeAmount = 0
  shoeSelections.forEach((sel, index) => {
    const amount = shoeSelectionAmount(sel, shoeRentalPriceCents)
    lineItems.push({
      label:
        sel.size === 'OWN'
          ? `Bowler ${index + 1} · Own shoes`
          : `Bowler ${index + 1} · Shoes`,
      amount,
      type: 'shoe',
    })
    shoeAmount += amount
  })

  return {
    baseAmount: base.baseAmount,
    gameAmount: 0,
    shoeAmount,
    totalAmount: base.baseAmount + shoeAmount,
    lineItems,
  }
}

/**
 * Format an integer cent amount for display.
 * Example: 4500 → "$45.00"
 */
export function formatPrice(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100)
}

/** Dollar amount for controlled number inputs (no currency symbol). */
export function formatPriceInputValue(amountCents: number): string {
  return (amountCents / 100).toFixed(2)
}

/** Parse a dollar string from a settings input into integer cents. */
export function parsePriceInputValue(value: string): number | null {
  const dollars = Number(value)
  if (!Number.isFinite(dollars) || dollars < 0) return null
  return Math.round(dollars * 100)
}
