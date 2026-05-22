import { getLaneCount } from '@/lib/lane-logic'

import type { TimeSlot } from '@/types'

/** At or above this many remaining "party spots", show wireframe label `Open`. */
const SLOT_AVAILABILITY_OPEN_THRESHOLD = 3

const DATE_SHORT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

const TIME_SHORT = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

/** Wireframe 1b `step-sub` on the time step (`booking-step1-2-branded.html`). */
export function formatBowlersLanesDateSummary(
  bowlerCount: number,
  dateIso: string,
): string {
  const lanes = getLaneCount(bowlerCount)
  const laneWord = lanes === 1 ? 'lane' : 'lanes'
  const bowlerWord = bowlerCount === 1 ? 'bowler' : 'bowlers'
  const d = new Date(`${dateIso}T12:00:00`)
  return `${bowlerCount} ${bowlerWord} · ${lanes} ${laneWord} · ${DATE_SHORT.format(d)}`
}

/** Wireframe package `step-sub` (`booking-step2-refined.html`). */
export function formatPackageStepSubtitle(
  bowlerCount: number,
  dateIso: string,
  startTime: Date,
): string {
  const bowlerWord = bowlerCount === 1 ? 'bowler' : 'bowlers'
  const d = new Date(`${dateIso}T12:00:00`)
  const timePart = TIME_SHORT.format(startTime)
    .toLowerCase()
    .replace(/\s/g, '')
  return `${bowlerCount} ${bowlerWord} · ${DATE_SHORT.format(d)} · ${timePart}`
}

/**
 * Second line under the time on each cell (`booking-step1-2-branded.html` Step 1b).
 * Uses `TimeSlot` availability fields from `getAvailableTimeSlots`.
 */
export function formatTimeSlotAvailabilityCaption(
  slot: TimeSlot,
  selectedSlotId: string | null,
): string {
  if (selectedSlotId != null && slot.id === selectedSlotId) {
    return '✓ Held'
  }
  if (!slot.available) {
    return 'Full'
  }
  const spots = slot.spotsRemaining
  if (spots >= SLOT_AVAILABILITY_OPEN_THRESHOLD) {
    return 'Open'
  }
  if (spots === 1) {
    return '1 left'
  }
  if (spots <= 0) {
    return 'Full'
  }
  return `${spots} left`
}
