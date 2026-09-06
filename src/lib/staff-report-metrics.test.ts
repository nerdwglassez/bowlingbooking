import { describe, expect, it } from 'vitest'
import {
  buildUtilizationInputs,
  computeLaneUtilizationPercent,
  computeNoShowRate,
  computeRevenueBreakdown,
  computeSourceMix,
  enumerateZonedYmdRange,
  isPaidReportBooking,
  resolveStaffReportsWindowInTimezone,
  zonedStartOfDay,
  zonedYmd,
  type MetricsBookingRow,
} from '@/lib/staff-report-metrics'

function row(
  partial: Partial<MetricsBookingRow> & Pick<MetricsBookingRow, 'id' | 'startTime'>,
): MetricsBookingRow {
  return {
    totalAmount: 10_000,
    status: 'CONFIRMED',
    source: 'ONLINE',
    payment: { status: 'succeeded' },
    ...partial,
  }
}

describe('staff-report-metrics revenue', () => {
  it('computes gross, refunds, and net', () => {
    const rows = [
      row({
        id: '1',
        startTime: new Date('2026-05-01T18:00:00Z'),
        totalAmount: 10_000,
        payment: {
          status: 'succeeded',
          refundAmount: 2_000,
          refundStatus: 'SUCCEEDED',
        },
      }),
      row({
        id: '2',
        startTime: new Date('2026-05-02T18:00:00Z'),
        totalAmount: 5_000,
        payment: { status: 'cash' },
      }),
      row({
        id: '3',
        startTime: new Date('2026-05-03T18:00:00Z'),
        status: 'CANCELLED',
        totalAmount: 8_000,
        payment: { status: 'succeeded' },
      }),
    ]
    const b = computeRevenueBreakdown(rows)
    expect(b.grossRevenueCents).toBe(15_000)
    expect(b.refundTotalCents).toBe(2_000)
    expect(b.netRevenueCents).toBe(13_000)
    expect(b.bookingCount).toBe(2)
    expect(b.avgValueCents).toBe(7_500)
  })

  it('floors net at zero', () => {
    const rows = [
      row({
        id: '1',
        startTime: new Date('2026-05-01T18:00:00Z'),
        totalAmount: 1_000,
        payment: {
          status: 'succeeded',
          refundAmount: 5_000,
          refundStatus: 'SUCCEEDED',
        },
      }),
    ]
    expect(computeRevenueBreakdown(rows).netRevenueCents).toBe(0)
  })
})

describe('staff-report-metrics source mix + no-show', () => {
  it('buckets ONLINE / WALK_IN / PHONE', () => {
    const rows = [
      row({
        id: '1',
        startTime: new Date('2026-05-01T18:00:00Z'),
        source: 'ONLINE',
        totalAmount: 100,
      }),
      row({
        id: '2',
        startTime: new Date('2026-05-01T19:00:00Z'),
        source: 'WALK_IN',
        totalAmount: 200,
        payment: { status: 'cash' },
      }),
      row({
        id: '3',
        startTime: new Date('2026-05-01T20:00:00Z'),
        source: 'PHONE',
        totalAmount: 300,
      }),
    ]
    const mix = computeSourceMix(rows)
    expect(mix.map((m) => m.source)).toEqual(['ONLINE', 'WALK_IN', 'PHONE'])
    expect(mix.find((m) => m.source === 'WALK_IN')?.revenueCents).toBe(200)
    expect(mix.find((m) => m.source === 'PHONE')?.bookingCount).toBe(1)
  })

  it('computes no-show rate', () => {
    const rows = [
      row({ id: '1', startTime: new Date(), status: 'CONFIRMED' }),
      row({ id: '2', startTime: new Date(), status: 'NO_SHOW' }),
      row({ id: '3', startTime: new Date(), status: 'COMPLETED' }),
      row({ id: '4', startTime: new Date(), status: 'CANCELLED' }),
    ]
    expect(computeNoShowRate(rows)).toBe(33.3)
  })
})

describe('staff-report-metrics utilization', () => {
  it('computes booked lane minutes and utilization percent', () => {
    const bookings = [
      row({
        id: '1',
        startTime: new Date('2026-05-01T18:00:00Z'),
        endTime: new Date('2026-05-01T19:00:00Z'),
        laneCount: 2,
      }),
    ]
    const inputs = buildUtilizationInputs({
      laneCount: 10,
      operatingMinutesInWindow: 600,
      bookings,
      blocks: [
        {
          startTime: new Date('2026-05-01T12:00:00Z'),
          endTime: new Date('2026-05-01T13:00:00Z'),
          lanes: [1, 2],
        },
      ],
    })
    expect(inputs.bookedLaneMinutes).toBe(120)
    expect(inputs.blockedLaneMinutes).toBe(120)
    expect(computeLaneUtilizationPercent(inputs)).toBe(2)
  })
})

describe('staff-report-metrics timezone windows', () => {
  it('zonedYmd uses America/New_York wall date', () => {
    // 2026-05-01 02:00 UTC = 2026-04-30 evening EDT
    const d = new Date('2026-05-01T02:00:00.000Z')
    expect(zonedYmd(d, 'America/New_York')).toBe('2026-04-30')
  })

  it('today window uses tenant local midnight', () => {
    const now = new Date('2026-05-15T15:00:00.000Z')
    const window = resolveStaffReportsWindowInTimezone(
      'today',
      'America/New_York',
      undefined,
      undefined,
      now,
    )
    expect(zonedYmd(window.startDate, 'America/New_York')).toBe('2026-05-15')
    expect(zonedYmd(window.endDate, 'America/New_York')).toBe('2026-05-15')
    expect(zonedYmd(window.previousStart, 'America/New_York')).toBe('2026-05-14')
    // Start should be 04:00 UTC during EDT
    expect(window.startDate.toISOString()).toBe('2026-05-15T04:00:00.000Z')
  })

  it('enumerates zoned day keys', () => {
    const start = zonedStartOfDay(
      new Date('2026-05-01T12:00:00.000Z'),
      'America/Chicago',
    )
    const end = zonedStartOfDay(
      new Date('2026-05-03T12:00:00.000Z'),
      'America/Chicago',
    )
    expect(enumerateZonedYmdRange(start, end, 'America/Chicago')).toEqual([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
    ])
  })

  it('isPaidReportBooking requires captured payment', () => {
    expect(
      isPaidReportBooking(
        row({
          id: '1',
          startTime: new Date(),
          payment: { status: 'requires_payment_method' },
        }),
      ),
    ).toBe(false)
  })
})
