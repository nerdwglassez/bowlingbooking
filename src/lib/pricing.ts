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
import { OWN_SHOES_VALUE } from '@/lib/shoe-sizes'

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
    shoeRentalPriceCents,
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
      const amount =
        sel.size.length > 0 && sel.size !== OWN_SHOES_VALUE
          ? shoeRentalPriceCents
          : 0
      lineItems.push({
        label:
          sel.size === OWN_SHOES_VALUE
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

  const lineItems: LineItem[] = []
  if (laneReservationCents > 0) {
    lineItems.push({
      label: laneCount === 1 ? 'Lane reservation' : `${laneCount} lanes`,
      amount: laneReservationCents,
      type: 'base',
    })
  }

  let shoeAmount = 0
  shoeSelections.forEach((sel, index) => {
    const amount =
      sel.size.length > 0 && sel.size !== OWN_SHOES_VALUE
        ? shoeRentalPriceCents
        : 0
    lineItems.push({
      label:
        sel.size === OWN_SHOES_VALUE
          ? `Bowler ${index + 1} · Own shoes`
          : `Bowler ${index + 1} · Shoes`,
      amount,
      type: 'shoe',
    })
    shoeAmount += amount
  })

  const baseAmount = laneReservationCents
  const totalAmount = baseAmount + shoeAmount

  return {
    baseAmount,
    gameAmount: 0,
    shoeAmount,
    totalAmount,
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
