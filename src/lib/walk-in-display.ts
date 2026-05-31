// walk-in-display.ts — Pure helpers for the walk-in sheet (walkin-booking-flow.html).

import type { CockpitLaneCard } from '@/lib/actions/staff'
import { getLaneCount } from '@/lib/lane-logic'
import { formatPrice } from '@/lib/pricing'
import type { Package } from '@/types'

export type WalkInBookingSource = 'walk_in' | 'phone' | 'advance'

export type WalkInMiniLaneState =
  | 'available'
  | 'occupied'
  | 'blocked'
  | 'selected'

const SOURCE_LABEL: Record<WalkInBookingSource, string> = {
  walk_in: 'Walk-in',
  phone: 'Phone',
  advance: 'Advance',
}

export function formatWalkInSource(source: WalkInBookingSource): string {
  return SOURCE_LABEL[source]
}

export function walkInSourceToDb(
  source: WalkInBookingSource,
): 'WALK_IN' | 'PHONE' {
  return source === 'walk_in' ? 'WALK_IN' : 'PHONE'
}

export function formatPackageOptionLabel(pkg: Package): string {
  if (pkg.gameIncluded && !pkg.gameCostPer) {
    return `${pkg.name} — ${formatPrice(pkg.basePrice)} flat`
  }
  const rate = pkg.gameCostPer ?? pkg.basePrice
  return `${pkg.name} — ${formatPrice(rate)}/hr per person`
}

export function formatBowlerLaneHint(bowlerCount: number): string {
  const lanes = getLaneCount(bowlerCount)
  return lanes === 1 ? '= 1 lane' : `= ${lanes} lanes`
}

export function formatBowlersSummary(bowlerCount: number): string {
  const lanes = getLaneCount(bowlerCount)
  const bowlerLabel = bowlerCount === 1 ? 'bowler' : 'bowlers'
  const laneLabel = lanes === 1 ? 'lane' : 'lanes'
  return `${bowlerCount} ${bowlerLabel} · ${lanes} ${laneLabel}`
}

export function formatLaneSummary(laneNumbers: number[]): string {
  if (laneNumbers.length === 0) return '—'
  if (laneNumbers.length === 1) return `Lane ${laneNumbers[0]}`
  const sorted = [...laneNumbers].sort((a, b) => a - b)
  if (sorted.length === 2) return `Lanes ${sorted[0]}–${sorted[1]}`
  return `Lanes ${sorted[0]}–${sorted[sorted.length - 1]}`
}

export function pickAutoLanes(
  lanes: CockpitLaneCard[],
  bowlerCount: number,
): number[] {
  const needed = getLaneCount(bowlerCount)
  const available = lanes
    .filter((lane) => lane.state === 'available')
    .map((lane) => lane.number)
  return available.slice(0, needed)
}

export function cockpitLaneToMiniState(
  lane: CockpitLaneCard,
  selected: number[],
): WalkInMiniLaneState {
  if (selected.includes(lane.number)) return 'selected'
  if (lane.state === 'blocked') return 'blocked'
  if (lane.state === 'occupied' || lane.state === 'upcoming') {
    return 'occupied'
  }
  return 'available'
}

export function canSelectMiniLane(state: WalkInMiniLaneState): boolean {
  return state === 'available' || state === 'selected'
}

/** Round down to the current minute for walk-in "now" starts. */
export function walkInStartNow(reference = new Date()): Date {
  const d = new Date(reference)
  d.setSeconds(0, 0)
  return d
}

export function formatWalkInStartedAt(start: Date): string {
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start)
  return `Now · ${time}`
}

export function toDatetimeLocalValue(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function hasWalkInDraft(values: {
  customerName: string
  customerEmail: string
  bowlerCount: number
}): boolean {
  return (
    values.customerName.trim().length > 0 ||
    values.customerEmail.trim().length > 0 ||
    values.bowlerCount !== 4
  )
}
