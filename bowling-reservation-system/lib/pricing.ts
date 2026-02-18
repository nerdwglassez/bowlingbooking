/**
 * Pricing configuration and calculation utilities
 */

// Base pricing fallback when settings are not loaded (e.g. initial render)
const LANE_PRICE_PER_HOUR = 20.0 // $20 per hour per lane
const SHOE_RENTAL_PRICE = 4.0 // $4 per pair of shoes

/** Pricing values from staff settings (e.g. from GET /api/pricing) */
export interface PricingSettingsForBooking {
  laneRentalPerHour: number
  bowlerPricePerPerson: number
  shoeRental: number
  taxRate: number
}

/**
 * Calculate the base lane rental price (uses fallback constants)
 */
export function calculateLanePrice(durationMinutes: number): number {
  const hours = durationMinutes / 60
  return hours * LANE_PRICE_PER_HOUR
}

/**
 * Calculate shoe rental price (uses fallback constants)
 */
export function calculateShoePrice(numShoes: number): number {
  return numShoes * SHOE_RENTAL_PRICE
}

/**
 * Calculate total booking price (uses fallback constants; for backward compatibility)
 */
export interface BookingPriceBreakdown {
  lanePrice: number
  bowlerPrice: number
  shoePrice: number
  packagePrice: number
  productPrice: number
  subtotal: number
  tax: number
  total: number
}

export function calculateBookingPrice(
  durationMinutes: number,
  numShoes: number,
  packagePrices: number[] = [],
  productTotal: number = 0,
  numLanes: number = 1
): BookingPriceBreakdown {
  const lanePrice = calculateLanePrice(durationMinutes) * numLanes
  const shoePrice = calculateShoePrice(numShoes)
  const packagePrice = packagePrices.reduce((sum, price) => sum + price, 0)
  const productPrice = productTotal

  const subtotal = lanePrice + shoePrice + packagePrice + productPrice
  const tax = subtotal * 0.08
  const total = subtotal + tax

  return {
    lanePrice,
    bowlerPrice: 0,
    shoePrice,
    packagePrice,
    productPrice,
    subtotal,
    tax,
    total,
  }
}

/**
 * Calculate booking price using staff pricing settings so the UI matches the booking API.
 * Uses Math.ceil(duration/60) for hours to match server.
 */
export function calculateBookingPriceWithSettings(
  settings: PricingSettingsForBooking,
  durationMinutes: number,
  numBowlers: number,
  numShoes: number,
  packagePrices: number[],
  productTotal: number,
  numLanes: number
): BookingPriceBreakdown {
  const hours = Math.ceil(durationMinutes / 60)
  const lanePrice = settings.laneRentalPerHour * hours * numLanes
  const bowlerPrice = numBowlers * (settings.bowlerPricePerPerson || 0)
  const shoePrice = numShoes * settings.shoeRental
  const packagePrice = packagePrices.reduce((sum, p) => sum + p, 0)
  const productPrice = productTotal

  const subtotal = lanePrice + bowlerPrice + shoePrice + packagePrice + productPrice
  const tax = subtotal * settings.taxRate
  const total = subtotal + tax

  return {
    lanePrice,
    bowlerPrice,
    shoePrice,
    packagePrice,
    productPrice,
    subtotal,
    tax,
    total,
  }
}


