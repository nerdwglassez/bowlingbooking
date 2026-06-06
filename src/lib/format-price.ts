/**
 * Price display helpers — safe for client components.
 * Calculation logic lives in `@/lib/pricing`.
 */

/** Format an integer cent amount for display. Example: 4500 → "$45.00" */
export function formatPrice(amountCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100)
}

/** Dollar amount for controlled number inputs (no currency symbol). */
export function formatPriceInputValue(amountCents: number): string {
  const wholeDollars = Math.trunc(amountCents / 100)
  const centsPart = Math.abs(amountCents % 100)
  return `${wholeDollars}.${String(centsPart).padStart(2, '0')}`
}

/** Parse a dollar string from a settings input into integer cents. */
export function parsePriceInputValue(value: string): number | null {
  const dollars = Number(value)
  if (!Number.isFinite(dollars) || dollars < 0) return null
  return Math.round(dollars * 100)
}
