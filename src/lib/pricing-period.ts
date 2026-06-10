import type { PricingPeriod } from '@/generated/prisma/client'

/** Resolve the highest-priority pricing period for a booking start time. */
export function resolvePricingPeriod(
  periods: PricingPeriod[],
  startTime: Date,
): PricingPeriod | null {
  if (periods.length === 0) return null

  const dayOfWeek = startTime.getDay()
  const dateOnly = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate(),
  )

  const matching = periods.filter((p) => {
    const dateMatch = p.specificDates.some(
      (d) =>
        d.getFullYear() === dateOnly.getFullYear() &&
        d.getMonth() === dateOnly.getMonth() &&
        d.getDate() === dateOnly.getDate(),
    )
    if (dateMatch) return true
    if (p.daysOfWeek.length === 0) return true
    return p.daysOfWeek.includes(dayOfWeek)
  })

  if (matching.length === 0) {
    return periods.find((p) => p.priority === 0) ?? periods[0] ?? null
  }

  return matching.sort((a, b) => b.priority - a.priority)[0] ?? null
}

export function rateBasedTotalCents(input: {
  bowlerCount: number
  durationMins: number
  ratePerPersonPerHour: number
}): number {
  const hours = input.durationMins / 60
  return Math.round(
    input.bowlerCount * hours * input.ratePerPersonPerHour,
  )
}
