// ============================================================
// pricing.ts — Package price calculation
//
// Pricing resolves from package flags (gameIncluded, shoesIncluded).
// Never hardcode prices in UI components.
// Always call calculatePrice() and render the result.
// ============================================================

import type { Package, PricingResult, LineItem } from '@/types'

interface PricingInput {
  package: Package
  bowlerCount: number
  gamesPerBowler?: number  // default: 2 (can be set in venue config)
}

/**
 * Calculate the full price breakdown for a booking.
 * All monetary amounts in the result and on `Package` are **integer cents** (e.g. 4500 = $45.00).
 * Returns line items suitable for rendering in the price footer.
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const { package: pkg, bowlerCount, gamesPerBowler = 2 } = input
  const lineItems: LineItem[] = []

  // Base package price
  lineItems.push({
    label: pkg.name,
    amount: pkg.basePrice,
    type: 'base',
  })

  // Game cost — only if NOT included in package
  let gameAmount = 0
  if (!pkg.gameIncluded && pkg.gameCostPer != null) {
    gameAmount = pkg.gameCostPer * bowlerCount * gamesPerBowler
    lineItems.push({
      label: `Games (${bowlerCount} × ${gamesPerBowler})`,
      amount: gameAmount,
      type: 'game',
    })
  }

  // Shoe rental — only if NOT included in package
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
