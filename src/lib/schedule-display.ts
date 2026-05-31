// schedule-display.ts — Pure helpers for the staff schedule tab (no server I/O).

import type {
  BlockedSlotRow,
  ScheduleBlockLevel,
  ScheduleDensityLevel,
} from '@/lib/actions/staff'

const DAY_DETAIL = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const SLOT_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

const BLOCK_LIST_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

export function isoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseMonthParam(value: string | undefined, fallback: Date): {
  year: number
  month: number
} {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split('-').map(Number)
    if (y >= 1970 && m >= 1 && m <= 12) {
      return { year: y, month: m - 1 }
    }
  }
  return { year: fallback.getFullYear(), month: fallback.getMonth() }
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function formatDayDetailTitle(dateISO: string): string {
  return DAY_DETAIL.format(new Date(`${dateISO}T12:00:00`))
}

export function formatSlotTime(d: Date): string {
  return SLOT_TIME.format(d)
}

export function formatLanePill(lanes: number[]): string {
  if (lanes.length === 0) return 'All lanes'
  const sorted = [...lanes].sort((a, b) => a - b)
  if (sorted.length === 1) return `Ln ${sorted[0]}`
  const consecutive = sorted.every(
    (n, i) => i === 0 || n === sorted[i - 1] + 1,
  )
  if (consecutive) return `Ln ${sorted[0]}–${sorted[sorted.length - 1]}`
  return `Ln ${sorted.join(', ')}`
}

export function formatBlockScopeBadge(lanes: number[]): string {
  if (lanes.length === 0) return 'All lanes'
  if (lanes.length === 1) return `Lane ${lanes[0]}`
  const sorted = [...lanes].sort((a, b) => a - b)
  const consecutive = sorted.every(
    (n, i) => i === 0 || n === sorted[i - 1] + 1,
  )
  if (consecutive) return `Lanes ${sorted[0]}–${sorted[sorted.length - 1]}`
  return `Lanes ${sorted.join(', ')}`
}

export function formatBlockListDate(block: BlockedSlotRow): string {
  const start = block.startTime
  const end = block.endTime
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  const allDay =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    end.getHours() >= 23

  if (!sameDay) {
    const startStr = BLOCK_LIST_DATE.format(start)
    const endStr = BLOCK_LIST_DATE.format(end)
    return `${startStr} – ${endStr}`
  }

  const dateStr = BLOCK_LIST_DATE.format(start)
  if (allDay) return `${dateStr} · All day`
  return `${dateStr} · ${formatSlotTime(start)} – ${formatSlotTime(end)}`
}

export function densityLevelFromPercent(
  percent: number,
): ScheduleDensityLevel {
  if (percent >= 90) return 'full'
  if (percent >= 50) return 'busy'
  return 'low'
}

export function computeBlockLevel(
  dayBlocks: BlockedSlotRow[],
  totalLanes: number,
): ScheduleBlockLevel {
  if (dayBlocks.length === 0) return 'none'
  if (dayBlocks.some((b) => b.lanes.length === 0)) return 'full'
  const blocked = new Set<number>()
  for (const b of dayBlocks) {
    for (const lane of b.lanes) blocked.add(lane)
  }
  if (totalLanes > 0 && blocked.size >= totalLanes) return 'full'
  return 'partial'
}

export type CalendarCell = {
  dateISO: string
  day: number
  inMonth: boolean
}

export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: CalendarCell[] = []

  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, i - startOffset + 1)
    cells.push({
      dateISO: isoDateLocal(d),
      day: d.getDate(),
      inMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    cells.push({ dateISO: isoDateLocal(d), day, inMonth: true })
  }

  let trailing = 1
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, trailing++)
    cells.push({
      dateISO: isoDateLocal(d),
      day: d.getDate(),
      inMonth: false,
    })
  }

  return cells
}
