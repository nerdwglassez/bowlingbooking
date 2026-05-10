export type BookingLaneAssignment = {
  lane: number
  lanes: string | null
  laneNumbers: number[]
}

export function parsePersistedBookingLanes(booking: { lane: number; lanes?: string | null }): number[] {
  if (booking.lanes) {
    try {
      const parsed = JSON.parse(booking.lanes) as unknown
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((lane) => Number(lane))
          .filter((lane) => Number.isInteger(lane) && lane > 0)
        if (normalized.length > 0) return normalized
      }
    } catch {
      // Fall back to the primary lane when legacy or malformed lane JSON is present.
    }
  }

  return [booking.lane]
}

export function pickAdjacentLanes(availableLanes: number[], count: number): number[] {
  if (count <= 0 || availableLanes.length < count) return availableLanes.slice(0, count)

  const sorted = [...availableLanes].sort((a, b) => a - b)
  for (let i = 0; i <= sorted.length - count; i += 1) {
    const slice = sorted.slice(i, i + count)
    const isAdjacent = slice.every((lane, index) => index === 0 || lane === slice[index - 1] + 1)
    if (isAdjacent) return slice
  }

  return sorted.slice(0, count)
}

export function buildBookingLaneAssignment(
  availableLanes: number[],
  requiredLaneCount: number
): BookingLaneAssignment | null {
  if (requiredLaneCount < 1 || availableLanes.length < requiredLaneCount) return null

  const laneNumbers = pickAdjacentLanes(availableLanes, requiredLaneCount)
  if (laneNumbers.length < requiredLaneCount) return null

  return {
    lane: laneNumbers[0],
    lanes: requiredLaneCount > 1 ? JSON.stringify(laneNumbers) : null,
    laneNumbers,
  }
}
