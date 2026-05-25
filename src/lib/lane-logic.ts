// ============================================================
// lane-logic.ts — Lane assignment business rules
//
// Rule: 1 lane per 6 bowlers (ceiling division)
// Example: 7 bowlers → 2 lanes, 12 → 2, 13 → 3
// Max online booking: 18 bowlers = 3 lanes
// ============================================================

/**
 * Calculate number of lanes required for a given bowler count.
 * Always use ceiling division: ceil(bowlerCount / 6)
 */
export function getLaneCount(bowlerCount: number): number {
  if (bowlerCount < 1) return 0
  return Math.ceil(bowlerCount / 6)
}

/**
 * Check if a bowler count is eligible for online booking.
 * Groups over maxOnlineBowlers must call in.
 */
export function isEligibleForOnlineBooking(
  bowlerCount: number,
  maxOnlineBowlers = 18
): boolean {
  return bowlerCount >= 1 && bowlerCount <= maxOnlineBowlers
}

/**
 * Get a human-readable lane assignment summary.
 * Example: "2 lanes for 7 bowlers"
 */
export function getLaneAssignmentSummary(bowlerCount: number): string {
  const laneCount = getLaneCount(bowlerCount)
  const laneLabel = laneCount === 1 ? 'lane' : 'lanes'
  const bowlerLabel = bowlerCount === 1 ? 'bowler' : 'bowlers'
  return `${laneCount} ${laneLabel} for ${bowlerCount} ${bowlerLabel}`
}

/** Wireframe copy (`booking-step1-2-branded.html` Step 1) — lane line under bowler control */
export function formatLaneRequirementLine(bowlerCount: number): string {
  const laneCount = getLaneCount(bowlerCount)
  return laneCount === 1 ? '1 lane required' : `${laneCount} lanes required`
}

export interface LaneReservationSlot {
  startTime: Date
  endTime: Date
  laneCount: number
}

/** Sum laneCount for reservations overlapping [startTime, endTime). */
export function sumOverlappingLaneCount(
  reservations: LaneReservationSlot[],
  startTime: Date,
  endTime: Date,
): number {
  return reservations
    .filter((r) => r.startTime < endTime && r.endTime > startTime)
    .reduce((acc, r) => acc + r.laneCount, 0)
}
