'use server'

// staff-reports.ts — Manager+ analytics and contacts for /staff/reports.

import { requireRole } from '@/lib/auth'
import { shouldUseDevDbFallback, warnOnce } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { assertStaffTenantAccess } from '@/lib/tenant-access'
import {
  busiestDayFromBookings,
  buildWeeklyBars,
  computeDelta,
  contactIdFromEmail,
  emailFromContactId,
  normalizeStaffReportsPeriod,
  periodComparisonLabel,
  resolveStaffReportsWindow,
  type StaffAnalyticsPackageRow,
  type StaffAnalyticsSummary,
  type StaffContactDetail,
  type StaffContactHistoryItem,
  type StaffContactHistoryStatus,
  type StaffContactRow,
  type StaffPromoUsageRow,
  type StaffReportsPeriod,
} from '@/lib/reports-display'

type AnalyticsBookingRow = {
  id: string
  startTime: Date
  totalAmount: number
  status: string
  packageId: string
  discountAmount: number
  package: { id: string; name: string }
  payment: { status: string } | null
  promoCode: { code: string } | null
}

function isCapturedPayment(
  payment: { status: string } | null | undefined,
): boolean {
  if (!payment) return false
  return payment.status === 'succeeded' || payment.status === 'cash'
}

function toIso(d: Date): string {
  return d.toISOString()
}

function mapHistoryStatus(
  status: string,
  startTime: Date,
  now: Date,
): StaffContactHistoryStatus {
  if (status === 'CANCELLED') return 'cancelled'
  if (status === 'COMPLETED') return 'completed'
  if (startTime > now) return 'upcoming'
  return 'checked_in'
}

function formatLaneLabel(numbers: number[]): string {
  if (numbers.length === 0) return 'Unassigned'
  const sorted = [...numbers].sort((a, b) => a - b)
  if (sorted.length === 1) return `Lane ${sorted[0]}`
  const contiguous =
    sorted[sorted.length - 1] - sorted[0] === sorted.length - 1
  if (contiguous) return `Lanes ${sorted[0]}–${sorted[sorted.length - 1]}`
  return sorted.map((n) => `Lane ${n}`).join(', ')
}

function buildAnalyticsFromRows(
  period: StaffReportsPeriod,
  window: ReturnType<typeof resolveStaffReportsWindow>,
  currentRows: AnalyticsBookingRow[],
  previousRows: AnalyticsBookingRow[],
): StaffAnalyticsSummary {
  const comparisonLabel = periodComparisonLabel(period)
  const paidCurrent = currentRows.filter(
    (b) =>
      (b.status === 'CONFIRMED' || b.status === 'COMPLETED') &&
      isCapturedPayment(b.payment),
  )
  const paidPrevious = previousRows.filter(
    (b) =>
      (b.status === 'CONFIRMED' || b.status === 'COMPLETED') &&
      isCapturedPayment(b.payment),
  )

  const revenueCents = paidCurrent.reduce((s, b) => s + b.totalAmount, 0)
  const prevRevenue = paidPrevious.reduce((s, b) => s + b.totalAmount, 0)
  const bookingCount = paidCurrent.length
  const prevBookings = paidPrevious.length
  const avgValueCents =
    bookingCount > 0 ? Math.floor(revenueCents / bookingCount) : 0
  const prevAvg =
    prevBookings > 0
      ? Math.floor(
          paidPrevious.reduce((s, b) => s + b.totalAmount, 0) / prevBookings,
        )
      : 0

  const noShowCurrent = currentRows.filter((b) => b.status === 'NO_SHOW').length
  const noShowDenom =
    currentRows.filter((b) =>
      ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(b.status),
    ).length || 1
  const noShowRate = Math.round((noShowCurrent / noShowDenom) * 1000) / 10

  const prevNoShow = previousRows.filter((b) => b.status === 'NO_SHOW').length
  const prevNoShowDenom =
    previousRows.filter((b) =>
      ['CONFIRMED', 'COMPLETED', 'NO_SHOW'].includes(b.status),
    ).length || 1
  const prevNoShowRate = Math.round((prevNoShow / prevNoShowDenom) * 1000) / 10

  const dailyMap = new Map<string, number>()
  let cur = new Date(window.startDate)
  const endDay = new Date(window.endDate)
  while (cur <= endDay) {
    dailyMap.set(cur.toISOString().slice(0, 10), 0)
    cur = new Date(cur)
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  for (const b of paidCurrent) {
    const key = b.startTime.toISOString().slice(0, 10)
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + b.totalAmount)
  }
  const daily = [...dailyMap.entries()].map(([date, revenueCentsDay]) => ({
    date,
    revenueCents: revenueCentsDay,
  }))

  const pkgMap = new Map<string, StaffAnalyticsPackageRow>()
  for (const b of paidCurrent) {
    const curPkg = pkgMap.get(b.packageId) ?? {
      packageId: b.packageId,
      packageName: b.package.name,
      bookingCount: 0,
      revenueCents: 0,
    }
    curPkg.bookingCount += 1
    curPkg.revenueCents += b.totalAmount
    pkgMap.set(b.packageId, curPkg)
  }
  const packages = [...pkgMap.values()].sort(
    (a, b) => b.revenueCents - a.revenueCents,
  )

  const promoMap = new Map<string, StaffPromoUsageRow>()
  for (const b of currentRows) {
    if (!b.promoCode || b.discountAmount <= 0) continue
    const curPromo = promoMap.get(b.promoCode.code) ?? {
      code: b.promoCode.code,
      uses: 0,
      savedCents: 0,
    }
    curPromo.uses += 1
    curPromo.savedCents += b.discountAmount
    promoMap.set(b.promoCode.code, curPromo)
  }
  const promoUsage = [...promoMap.values()].sort(
    (a, b) => b.savedCents - a.savedCents,
  )

  return {
    period,
    startDate: toIso(window.startDate),
    endDate: toIso(window.endDate),
    revenueCents,
    revenueDelta: computeDelta(revenueCents, prevRevenue, comparisonLabel),
    weeklyBars: buildWeeklyBars(period, daily),
    bookingCount,
    bookingsDelta: computeDelta(bookingCount, prevBookings, comparisonLabel),
    avgValueCents,
    avgValueDelta: computeDelta(avgValueCents, prevAvg, comparisonLabel),
    busiestDay: busiestDayFromBookings(paidCurrent),
    noShowRate,
    noShowDelta: computeDelta(noShowRate, prevNoShowRate, comparisonLabel),
    packages,
    promoUsage,
  }
}

function mockStaffAnalyticsSummary(
  period: StaffReportsPeriod,
): StaffAnalyticsSummary {
  const now = new Date('2026-05-29T18:00:00.000Z')
  const window = resolveStaffReportsWindow(period, undefined, undefined, now)
  const comparisonLabel = periodComparisonLabel(period)

  return {
    period,
    startDate: toIso(window.startDate),
    endDate: toIso(window.endDate),
    revenueCents: 1_428_000,
    revenueDelta: { direction: 'up', percent: 12, comparisonLabel },
    weeklyBars: [
      { label: 'Wk 1', revenueCents: 280_000 },
      { label: 'Wk 2', revenueCents: 385_000 },
      { label: 'Wk 3', revenueCents: 490_000 },
      { label: 'Wk 4', revenueCents: 630_000, highlight: true },
    ],
    bookingCount: 184,
    bookingsDelta: { direction: 'up', percent: 8, comparisonLabel },
    avgValueCents: 7760,
    avgValueDelta: { direction: 'up', percent: 3, comparisonLabel },
    busiestDay: { dayName: 'Saturday', peakWindow: '6:00–8:00 PM peak' },
    noShowRate: 4.3,
    noShowDelta: { direction: 'down', percent: 1, comparisonLabel },
    packages: [
      {
        packageId: 'pkg-open',
        packageName: 'Open Bowl',
        bookingCount: 82,
        revenueCents: 533_000,
      },
      {
        packageId: 'pkg-cosmic',
        packageName: 'Cosmic Bowl',
        bookingCount: 54,
        revenueCents: 421_200,
      },
      {
        packageId: 'pkg-birthday',
        packageName: 'Birthday Party',
        bookingCount: 31,
        revenueCents: 325_500,
      },
      {
        packageId: 'pkg-corp',
        packageName: 'Corporate',
        bookingCount: 17,
        revenueCents: 148_300,
      },
    ],
    promoUsage: [
      { code: 'BOWL20', uses: 24, savedCents: 68_000 },
      { code: 'ACME20', uses: 3, savedCents: 64_800 },
      { code: 'SUMMER10', uses: 11, savedCents: 20_300 },
    ],
  }
}

const MOCK_CONTACTS: StaffContactRow[] = [
  {
    id: contactIdFromEmail('sarah@email.com'),
    name: 'Sarah Johnson',
    email: 'sarah@email.com',
    phone: '(803) 555-0147',
    bookingCount: 7,
    lastBookingDate: '2026-05-11T18:00:00.000Z',
    packageNames: ['Open Bowl'],
  },
  {
    id: contactIdFromEmail('marcus@email.com'),
    name: 'Marcus Williams',
    email: 'marcus@email.com',
    phone: '(803) 555-0182',
    bookingCount: 3,
    lastBookingDate: '2026-05-11T14:00:00.000Z',
    packageNames: ['Cosmic Bowl'],
  },
  {
    id: contactIdFromEmail('jordan@acmecorp.com'),
    name: 'Jordan Rivera',
    email: 'jordan@acmecorp.com',
    phone: '(803) 555-0193',
    bookingCount: 12,
    lastBookingDate: '2026-05-10T17:00:00.000Z',
    packageNames: ['Corporate Bowl', 'Cosmic Bowl', 'Open Bowl'],
  },
  {
    id: contactIdFromEmail('taylor@email.com'),
    name: 'Taylor Chen',
    email: 'taylor@email.com',
    phone: '(803) 555-0164',
    bookingCount: 2,
    lastBookingDate: '2026-05-10T12:00:00.000Z',
    packageNames: ['Open Bowl'],
  },
  {
    id: contactIdFromEmail('alex@email.com'),
    name: 'Alex Park',
    email: 'alex@email.com',
    phone: '(803) 555-0211',
    bookingCount: 5,
    lastBookingDate: '2026-05-08T19:00:00.000Z',
    packageNames: ['Cosmic Bowl'],
  },
  {
    id: contactIdFromEmail('riley@email.com'),
    name: 'Riley Lee',
    email: 'riley@email.com',
    phone: '(803) 555-0088',
    bookingCount: 1,
    lastBookingDate: '2026-05-03T15:00:00.000Z',
    packageNames: ['Open Bowl'],
  },
]

function mockContactDetail(contactId: string): StaffContactDetail | null {
  const email = emailFromContactId(contactId)
  const row = MOCK_CONTACTS.find((c) => c.email === email)
  if (!row) return null

  const history: StaffContactHistoryItem[] =
    email === 'jordan@acmecorp.com'
      ? [
          {
            bookingId: 'bk-jr-1',
            confirmationCode: 'RZL-7741',
            startTime: '2026-05-16T22:00:00.000Z',
            bowlerCount: 24,
            packageName: 'Corporate Bowl',
            laneLabel: 'Lanes 1–4',
            amountCents: 86_400,
            status: 'upcoming',
          },
          {
            bookingId: 'bk-jr-2',
            confirmationCode: 'RZL-7620',
            startTime: '2026-05-10T17:00:00.000Z',
            bowlerCount: 6,
            packageName: 'Cosmic Bowl',
            laneLabel: 'Lane 4',
            amountCents: 16_000,
            status: 'checked_in',
          },
          {
            bookingId: 'bk-jr-3',
            confirmationCode: 'RZL-7102',
            startTime: '2026-04-12T19:00:00.000Z',
            bowlerCount: 8,
            packageName: 'Open Bowl',
            laneLabel: 'Lanes 2–3',
            amountCents: 19_200,
            status: 'completed',
          },
          {
            bookingId: 'bk-jr-4',
            confirmationCode: 'RZL-6801',
            startTime: '2026-03-07T23:00:00.000Z',
            bowlerCount: 12,
            packageName: 'Corporate Bowl',
            laneLabel: 'Lanes 1–2',
            amountCents: 0,
            status: 'cancelled',
          },
          {
            bookingId: 'bk-jr-5',
            confirmationCode: 'RZL-6500',
            startTime: '2026-02-22T19:00:00.000Z',
            bowlerCount: 6,
            packageName: 'Open Bowl',
            laneLabel: 'Lane 5',
            amountCents: 14_400,
            status: 'completed',
          },
        ]
      : [
          {
            bookingId: `bk-${row.id}-1`,
            confirmationCode: 'RZL-9001',
            startTime: row.lastBookingDate,
            bowlerCount: 4,
            packageName: 'Open Bowl',
            laneLabel: 'Lane 2',
            amountCents: 12_000,
            status: 'completed',
          },
        ]

  const paid = history.filter((h) => h.amountCents > 0)
  const totalSpentCents = paid.reduce((s, h) => s + h.amountCents, 0)

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    customerSince: '2025-02-01T12:00:00.000Z',
    bookingCount: row.bookingCount,
    totalSpentCents: email === 'jordan@acmecorp.com' ? 214_000 : totalSpentCents,
    avgBookingCents:
      email === 'jordan@acmecorp.com'
        ? 17_833
        : paid.length > 0
          ? Math.floor(totalSpentCents / paid.length)
          : 0,
    history,
    hiddenHistoryCount: email === 'jordan@acmecorp.com' ? 7 : 0,
  }
}

async function fetchAnalyticsBookings(
  tenantId: string,
  start: Date,
  end: Date,
): Promise<AnalyticsBookingRow[]> {
  return prisma.booking.findMany({
    where: {
      tenantId,
      startTime: { gte: start, lte: end },
      status: {
        in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
      },
    },
    select: {
      id: true,
      startTime: true,
      totalAmount: true,
      status: true,
      packageId: true,
      discountAmount: true,
      package: { select: { id: true, name: true } },
      payment: { select: { status: true } },
      promoCode: { select: { code: true } },
    },
  })
}

export async function getStaffAnalyticsSummary(
  tenantId: string,
  periodInput: string | undefined,
  customStart?: string,
  customEnd?: string,
): Promise<StaffAnalyticsSummary> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)
  const period = normalizeStaffReportsPeriod(periodInput)

  if (shouldUseDevDbFallback()) {
    warnOnce(
      'staff-reports-analytics',
      'Database unavailable — returning mock staff analytics.',
    )
    return mockStaffAnalyticsSummary(period)
  }

  const window = resolveStaffReportsWindow(
    period,
    customStart,
    customEnd,
  )

  try {
    const [currentRows, previousRows] = await Promise.all([
      fetchAnalyticsBookings(tenantId, window.startDate, window.endDate),
      fetchAnalyticsBookings(
        tenantId,
        window.previousStart,
        window.previousEnd,
      ),
    ])
    return buildAnalyticsFromRows(period, window, currentRows, previousRows)
  } catch (err) {
    if (shouldUseDevDbFallback(err)) {
      warnOnce(
        'staff-reports-analytics',
        'Database unreachable — returning mock staff analytics.',
      )
      return mockStaffAnalyticsSummary(period)
    }
    throw err
  }
}

export async function listStaffContacts(
  tenantId: string,
): Promise<StaffContactRow[]> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)

  if (shouldUseDevDbFallback()) {
    return MOCK_CONTACTS
  }

  try {
    const rows = await prisma.booking.findMany({
      where: { tenantId },
      select: {
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        startTime: true,
        package: { select: { name: true } },
      },
      orderBy: { startTime: 'desc' },
    })

    const byEmail = new Map<string, StaffContactRow>()
    for (const row of rows) {
      const email = row.customerEmail.trim().toLowerCase()
      const existing = byEmail.get(email)
      const packageName = row.package?.name
      if (!existing) {
        byEmail.set(email, {
          id: contactIdFromEmail(email),
          name: row.customerName,
          email: row.customerEmail,
          phone: row.customerPhone,
          bookingCount: 1,
          lastBookingDate: toIso(row.startTime),
          packageNames: packageName ? [packageName] : [],
        })
      } else {
        existing.bookingCount += 1
        if (packageName && !existing.packageNames.includes(packageName)) {
          existing.packageNames.push(packageName)
        }
      }
    }

    return [...byEmail.values()].sort(
      (a, b) =>
        new Date(b.lastBookingDate).getTime() -
        new Date(a.lastBookingDate).getTime(),
    )
  } catch (err) {
    if (shouldUseDevDbFallback(err)) {
      return MOCK_CONTACTS
    }
    throw err
  }
}

export async function getStaffContactDetail(
  tenantId: string,
  contactId: string,
): Promise<StaffContactDetail | null> {
  const user = await requireRole('MANAGER', 'ADMIN')
  assertStaffTenantAccess(user, tenantId)

  if (shouldUseDevDbFallback()) {
    return mockContactDetail(contactId)
  }

  const email = emailFromContactId(contactId)

  try {
    const bookings = await prisma.booking.findMany({
      where: { tenantId, customerEmail: { equals: email, mode: 'insensitive' } },
      include: {
        package: { select: { name: true } },
        payment: { select: { status: true } },
        lanes: { include: { lane: { select: { number: true } } } },
      },
      orderBy: { startTime: 'desc' },
    })

    if (bookings.length === 0) return null

    const now = new Date()
    const first = bookings[bookings.length - 1]
    const paid = bookings.filter(
      (b) =>
        (b.status === 'CONFIRMED' || b.status === 'COMPLETED') &&
        isCapturedPayment(b.payment),
    )
    const totalSpentCents = paid.reduce((s, b) => s + b.totalAmount, 0)

    const history: StaffContactHistoryItem[] = bookings.slice(0, 8).map((b) => {
      const laneNumbers = b.lanes.map((bl) => bl.lane.number)
      if (laneNumbers.length === 0 && b.laneCount > 0) {
        for (let i = 1; i <= b.laneCount; i++) laneNumbers.push(i)
      }
      return {
        bookingId: b.id,
        confirmationCode: b.confirmationCode,
        startTime: toIso(b.startTime),
        bowlerCount: b.bowlerCount,
        packageName: b.package.name,
        laneLabel: formatLaneLabel(laneNumbers),
        amountCents:
          isCapturedPayment(b.payment) &&
          (b.status === 'CONFIRMED' || b.status === 'COMPLETED')
            ? b.totalAmount
            : 0,
        status: mapHistoryStatus(b.status, b.startTime, now),
      }
    })

    return {
      id: contactIdFromEmail(email),
      name: first.customerName,
      email: first.customerEmail,
      phone: first.customerPhone,
      customerSince: toIso(first.createdAt),
      bookingCount: bookings.length,
      totalSpentCents,
      avgBookingCents:
        paid.length > 0 ? Math.floor(totalSpentCents / paid.length) : 0,
      history,
      hiddenHistoryCount: Math.max(0, bookings.length - history.length),
    }
  } catch (err) {
    if (shouldUseDevDbFallback(err)) {
      return mockContactDetail(contactId)
    }
    throw err
  }
}
