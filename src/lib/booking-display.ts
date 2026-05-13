import { getLaneCount } from '@/lib/lane-logic'

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
