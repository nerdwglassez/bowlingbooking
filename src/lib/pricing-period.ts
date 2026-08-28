import type { PricingPeriod } from '@/generated/prisma/client'

/** Minutes from midnight for an `HH:MM` clock string. Invalid values → null. */
export function parseClockMinutes(value: string | null | undefined): number | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) return null
  const hours = Number.parseInt(match[1]!, 10)
  const minutes = Number.parseInt(match[2]!, 10)
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/**
 * Whether `startTime`'s local clock falls in the period's start/end window.
 * Null/empty bounds mean "open" on that side. Overnight windows (end <= start)
 * wrap past midnight.
 */
export function periodMatchesClock(
  period: Pick<PricingPeriod, 'startTime' | 'endTime'>,
  startTime: Date,
): boolean {
  const windowStart = parseClockMinutes(period.startTime)
  const windowEnd = parseClockMinutes(period.endTime)
  if (windowStart == null && windowEnd == null) return true

  const at = startTime.getHours() * 60 + startTime.getMinutes()

  if (windowStart != null && windowEnd != null) {
    if (windowStart === windowEnd) return true
    if (windowStart < windowEnd) {
      return at >= windowStart && at < windowEnd
    }
    return at >= windowStart || at < windowEnd
  }
  if (windowStart != null) return at >= windowStart
  return at < windowEnd!
}

function periodMatchesDay(
  period: Pick<PricingPeriod, 'daysOfWeek' | 'specificDates'>,
  startTime: Date,
): boolean {
  const dateOnly = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate(),
  )
  const dateMatch = period.specificDates.some(
    (d) =>
      d.getFullYear() === dateOnly.getFullYear() &&
      d.getMonth() === dateOnly.getMonth() &&
      d.getDate() === dateOnly.getDate(),
  )
  if (dateMatch) return true
  // Empty daysOfWeek = every day (the "Default" all-week override).
  if (period.daysOfWeek.length === 0) return true
  return period.daysOfWeek.includes(startTime.getDay())
}

/**
 * Resolve the highest-priority pricing period for a booking start time.
 * Unmatched bookings must fall through to the tenant default rate — never
 * apply an override that does not match the day or clock window.
 */
export function resolvePricingPeriod(
  periods: PricingPeriod[],
  startTime: Date,
): PricingPeriod | null {
  if (periods.length === 0) return null

  const matching = periods.filter(
    (p) => periodMatchesDay(p, startTime) && periodMatchesClock(p, startTime),
  )

  if (matching.length === 0) return null

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
