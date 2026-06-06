// reports-display.ts — Staff reports UI helpers (reports-analytics-contacts.html).

import { formatPrice } from '@/lib/format-price'

export type StaffReportsSubview = 'analytics' | 'contacts'

export type StaffReportsPeriod = 'today' | 'week' | 'month' | 'custom'

export const STAFF_REPORTS_SUBVIEW_STORAGE_KEY = 'staff_reports_subview'

export type StaffMetricDelta = {
  direction: 'up' | 'down' | 'flat'
  /** Absolute percentage points for display (e.g. 12 → "+12%"). */
  percent: number
  comparisonLabel: string
}

export type StaffWeeklyBar = {
  label: string
  revenueCents: number
  highlight?: boolean
}

export type StaffAnalyticsPackageRow = {
  packageId: string
  packageName: string
  bookingCount: number
  revenueCents: number
}

export type StaffPromoUsageRow = {
  code: string
  uses: number
  savedCents: number
}

export type StaffAnalyticsSummary = {
  period: StaffReportsPeriod
  startDate: string
  endDate: string
  revenueCents: number
  revenueDelta: StaffMetricDelta
  weeklyBars: StaffWeeklyBar[]
  bookingCount: number
  bookingsDelta: StaffMetricDelta
  avgValueCents: number
  avgValueDelta: StaffMetricDelta
  busiestDay: { dayName: string; peakWindow: string } | null
  noShowRate: number
  noShowDelta: StaffMetricDelta
  packages: StaffAnalyticsPackageRow[]
  promoUsage: StaffPromoUsageRow[]
}

export type StaffContactRow = {
  id: string
  name: string
  email: string
  phone: string | null
  bookingCount: number
  lastBookingDate: string
}

export type StaffContactHistoryStatus =
  | 'upcoming'
  | 'checked_in'
  | 'completed'
  | 'cancelled'

export type StaffContactHistoryItem = {
  bookingId: string
  confirmationCode: string
  startTime: string
  bowlerCount: number
  packageName: string
  laneLabel: string
  amountCents: number
  status: StaffContactHistoryStatus
}

export type StaffContactDetail = {
  id: string
  name: string
  email: string
  phone: string | null
  customerSince: string
  bookingCount: number
  totalSpentCents: number
  avgBookingCents: number
  history: StaffContactHistoryItem[]
  hiddenHistoryCount: number
}

const PACKAGE_ACCENT_VARS = [
  'var(--color-action)',
  'var(--status-info-text)',
  'var(--status-warning-text)',
  'var(--status-ok-text)',
] as const

export function packageAccentColor(index: number): string {
  return PACKAGE_ACCENT_VARS[index % PACKAGE_ACCENT_VARS.length]
}

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function contactIdFromEmail(email: string): string {
  return encodeURIComponent(email.trim().toLowerCase())
}

export function emailFromContactId(contactId: string): string {
  return decodeURIComponent(contactId)
}

export function normalizeStaffReportsPeriod(
  raw: string | undefined,
): StaffReportsPeriod {
  if (raw === 'today' || raw === 'week' || raw === 'custom') return raw
  return 'month'
}

export function normalizeStaffReportsSubview(
  raw: string | undefined,
): StaffReportsSubview {
  return raw === 'contacts' ? 'contacts' : 'analytics'
}

function utcStartOfDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  )
}

function utcEndOfDay(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  )
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfUtcWeekSunday(d: Date): Date {
  const start = utcStartOfDay(d)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())
  return start
}

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

export type StaffReportsWindow = {
  period: StaffReportsPeriod
  startDate: Date
  endDate: Date
  previousStart: Date
  previousEnd: Date
}

export function resolveStaffReportsWindow(
  period: StaffReportsPeriod,
  customStart?: string,
  customEnd?: string,
  now = new Date(),
): StaffReportsWindow {
  const todayStart = utcStartOfDay(now)
  const todayEnd = utcEndOfDay(now)

  if (period === 'today') {
    const prevStart = addUtcDays(todayStart, -1)
    const prevEnd = utcEndOfDay(prevStart)
    return {
      period,
      startDate: todayStart,
      endDate: todayEnd,
      previousStart: prevStart,
      previousEnd: prevEnd,
    }
  }

  if (period === 'week') {
    const startDate = startOfUtcWeekSunday(now)
    const endDate = todayEnd
    const spanDays =
      Math.floor(
        (startDate.getTime() - endDate.getTime()) / 86_400_000,
      ) * -1 + 1
    const previousEnd = addUtcDays(startDate, -1)
    previousEnd.setUTCHours(23, 59, 59, 999)
    const previousStart = addUtcDays(utcStartOfDay(previousEnd), -(spanDays - 1))
    return {
      period,
      startDate,
      endDate,
      previousStart,
      previousEnd,
    }
  }

  if (period === 'custom' && customStart && customEnd) {
    const startDate = utcStartOfDay(new Date(`${customStart}T00:00:00.000Z`))
    const endDate = utcEndOfDay(new Date(`${customEnd}T00:00:00.000Z`))
    const spanMs = endDate.getTime() - startDate.getTime() + 1
    const previousEnd = new Date(startDate.getTime() - 1)
    const previousStart = new Date(previousEnd.getTime() - spanMs + 1)
    previousStart.setUTCHours(0, 0, 0, 0)
    return {
      period,
      startDate,
      endDate,
      previousStart,
      previousEnd,
    }
  }

  const startDate = startOfUtcMonth(now)
  const endDate = todayEnd
  const prevMonthEnd = new Date(startDate.getTime() - 1)
  const previousStart = startOfUtcMonth(prevMonthEnd)
  const previousEnd = utcEndOfDay(prevMonthEnd)
  return {
    period: period === 'custom' ? 'month' : period,
    startDate,
    endDate,
    previousStart,
    previousEnd,
  }
}

export function periodComparisonLabel(period: StaffReportsPeriod): string {
  switch (period) {
    case 'today':
      return 'vs yesterday'
    case 'week':
      return 'vs last week'
    case 'custom':
      return 'vs prior period'
    default:
      return 'vs last month'
  }
}

export function computeDelta(
  current: number,
  previous: number,
  comparisonLabel: string,
): StaffMetricDelta {
  if (previous === 0) {
    if (current === 0) {
      return { direction: 'flat', percent: 0, comparisonLabel }
    }
    return { direction: 'up', percent: 100, comparisonLabel }
  }
  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(Math.abs(change))
  if (Math.abs(change) < 0.5) {
    return { direction: 'flat', percent: 0, comparisonLabel }
  }
  return {
    direction: change > 0 ? 'up' : 'down',
    percent: rounded,
    comparisonLabel,
  }
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export function formatHistoryDate(iso: string): string {
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d)
  const rest = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
  return `${day} ${rest} · ${time}`
}

export function formatLastBookingDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function formatCustomerSince(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export function filterContacts(
  contacts: StaffContactRow[],
  query: string,
): StaffContactRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return contacts
  return contacts.filter((c) => {
    if (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) {
      return true
    }
    const phoneDigits = c.phone?.replace(/\D/g, '') ?? ''
    const queryDigits = q.replace(/\D/g, '')
    if (queryDigits.length === 0) return false
    return phoneDigits.includes(queryDigits)
  })
}

export function exportAnalyticsCsv(summary: StaffAnalyticsSummary): string {
  const lines = [
    'metric,value',
    `revenue_cents,${summary.revenueCents}`,
    `bookings,${summary.bookingCount}`,
    `avg_value_cents,${summary.avgValueCents}`,
    `no_show_rate,${summary.noShowRate}`,
    '',
    'package,bookings,revenue_cents',
    ...summary.packages.map(
      (p) =>
        `"${p.packageName.replace(/"/g, '""')}",${p.bookingCount},${p.revenueCents}`,
    ),
  ]
  if (summary.promoUsage.length > 0) {
    lines.push('', 'promo_code,uses,saved_cents')
    lines.push(
      ...summary.promoUsage.map(
        (p) => `${p.code},${p.uses},${p.savedCents}`,
      ),
    )
  }
  return lines.join('\n')
}

export function exportContactsCsv(contacts: StaffContactRow[]): string {
  const lines = [
    'name,email,phone,bookings,last_booking',
    ...contacts.map(
      (c) =>
        `"${c.name.replace(/"/g, '""')}","${c.email}","${c.phone ?? ''}",${c.bookingCount},${c.lastBookingDate.slice(0, 10)}`,
    ),
  ]
  return lines.join('\n')
}

export function exportContactHistoryCsv(
  contact: StaffContactDetail,
): string {
  const lines = [
    'date,code,bowlers,package,lanes,amount_cents,status',
    ...contact.history.map(
      (h) =>
        `${h.startTime.slice(0, 10)},${h.confirmationCode},${h.bowlerCount},"${h.packageName.replace(/"/g, '""')}","${h.laneLabel}",${h.amountCents},${h.status}`,
    ),
  ]
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function analyticsExportLabel(period: StaffReportsPeriod): string {
  switch (period) {
    case 'today':
      return "Export today's data as CSV"
    case 'week':
      return "Export this week's data as CSV"
    case 'custom':
      return 'Export period data as CSV'
    default:
      return "Export this month's data as CSV"
  }
}

export function formatDeltaPercent(delta: StaffMetricDelta): string {
  if (delta.direction === 'flat') return '0%'
  const sign = delta.direction === 'up' ? '+' : '−'
  return `${sign}${delta.percent}%`
}

export function formatMetricMoney(cents: number): string {
  return formatPrice(cents)
}

export function busiestDayFromBookings(
  rows: Array<{ startTime: Date }>,
): { dayName: string; peakWindow: string } | null {
  if (rows.length === 0) return null
  const byDay = new Map<number, number>()
  const byHour = new Map<number, number>()
  for (const row of rows) {
    const d = row.startTime
    const day = d.getUTCDay()
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
    const hour = d.getUTCHours()
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1)
  }
  let bestDay = 0
  let bestDayCount = 0
  for (const [day, count] of byDay) {
    if (count > bestDayCount) {
      bestDay = day
      bestDayCount = count
    }
  }
  let peakHour = 18
  let peakHourCount = 0
  for (const [hour, count] of byHour) {
    if (count > peakHourCount) {
      peakHour = hour
      peakHourCount = count
    }
  }
  const fmt = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    hour12: true,
  })
  const start = fmt.format(new Date(Date.UTC(2026, 0, 1, peakHour)))
  const end = fmt.format(new Date(Date.UTC(2026, 0, 1, peakHour + 2)))
  return {
    dayName: DAY_NAMES[bestDay] ?? 'Saturday',
    peakWindow: `${start}–${end} peak`,
  }
}

export function buildWeeklyBars(
  period: StaffReportsPeriod,
  daily: Array<{ date: string; revenueCents: number }>,
): StaffWeeklyBar[] {
  if (daily.length === 0) return []
  if (period === 'today') {
    return [{ label: 'Today', revenueCents: daily[0]?.revenueCents ?? 0, highlight: true }]
  }
  if (period === 'week') {
    return daily.map((d, i) => {
      const day = new Date(`${d.date}T12:00:00.000Z`)
      const label = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
        day,
      )
      return {
        label,
        revenueCents: d.revenueCents,
        highlight: i === daily.length - 1,
      }
    })
  }
  const chunkSize = Math.max(1, Math.ceil(daily.length / 4))
  const bars: StaffWeeklyBar[] = []
  for (let i = 0; i < daily.length; i += chunkSize) {
    const chunk = daily.slice(i, i + chunkSize)
    const revenueCents = chunk.reduce((sum, d) => sum + d.revenueCents, 0)
    bars.push({
      label: `Wk ${bars.length + 1}`,
      revenueCents,
      highlight: i + chunkSize >= daily.length,
    })
  }
  return bars
}
