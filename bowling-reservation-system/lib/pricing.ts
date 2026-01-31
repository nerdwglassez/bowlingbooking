/**
 * Pricing configuration and calculation utilities
 */

// Base pricing (can be moved to database/config later)
const LANE_PRICE_PER_HOUR = 20.0 // $20 per hour per lane
const SHOE_RENTAL_PRICE = 4.0 // $4 per pair of shoes

/**
 * Calculate the base lane rental price
 */
export function calculateLanePrice(durationMinutes: number): number {
  const hours = durationMinutes / 60
  return hours * LANE_PRICE_PER_HOUR
}

/**
 * Calculate shoe rental price
 */
export function calculateShoePrice(numShoes: number): number {
  return numShoes * SHOE_RENTAL_PRICE
}

/**
 * Calculate total booking price
 */
export interface BookingPriceBreakdown {
  lanePrice: number
  shoePrice: number
  packagePrice: number
  subtotal: number
  tax: number
  total: number
}

export function calculateBookingPrice(
  durationMinutes: number,
  numShoes: number,
  packagePrices: number[] = []
): BookingPriceBreakdown {
  const lanePrice = calculateLanePrice(durationMinutes)
  const shoePrice = calculateShoePrice(numShoes)
  const packagePrice = packagePrices.reduce((sum, price) => sum + price, 0)
  
  const subtotal = lanePrice + shoePrice + packagePrice
  const tax = subtotal * 0.08 // 8% tax (configurable)
  const total = subtotal + tax

  return {
    lanePrice,
    shoePrice,
    packagePrice,
    subtotal,
    tax,
    total,
  }
}


