import { describe, expect, it } from 'vitest'

import type { CockpitBookingRow, BlockedSlotRow } from '@/lib/actions/staff'
import {
  buildCockpitStats,
  buildCockpitHourlyBookings,
  buildCockpitTimeline,
  bookingListStatus,
  filterCockpitBookings,
} from '@/lib/cockpit-display'

function booking(
  overrides: Partial<CockpitBookingRow> & Pick<CockpitBookingRow, 'id' | 'startTime' | 'endTime' | 'status'>,
): CockpitBookingRow {
  return {
    confirmationCode: 'RZL0001',
    bowlerCount: 4,
    laneCount: 1,
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    customerPhone: null,
    source: 'ONLINE',
    packageName: 'Open Bowl',
    totalAmount: 3600,
    isRefunded: false,
    laneNumbers: [1],
    listStatus: 'confirmed',
    paymentPending: false,
    ...overrides,
  }
}

describe('buildCockpitStats', () => {
  it('counts total, upcoming, active, done, and late', () => {
    const now = new Date('2026-05-16T14:30:00')
    const rows = [
      booking({
        id: '1',
        startTime: new Date('2026-05-16T13:00:00'),
        endTime: new Date('2026-05-16T14:00:00'),
        status: 'COMPLETED',
      }),
      booking({
        id: '2',
        startTime: new Date('2026-05-16T14:00:00'),
        endTime: new Date('2026-05-16T15:00:00'),
        status: 'CONFIRMED',
      }),
      booking({
        id: '3',
        startTime: new Date('2026-05-16T16:00:00'),
        endTime: new Date('2026-05-16T17:00:00'),
        status: 'CONFIRMED',
      }),
    ]

    expect(buildCockpitStats(rows, now)).toEqual({
      total: 3,
      upcoming: 1,
      active: 0,
      done: 1,
      late: 1,
    })
  })

  it('marks bookings past the grace period as late', () => {
    const now = new Date('2026-05-16T14:10:00')
    const rows = [
      booking({
        id: 'late',
        startTime: new Date('2026-05-16T14:00:00'),
        endTime: new Date('2026-05-16T15:00:00'),
        status: 'CONFIRMED',
        listStatus: 'late',
      }),
    ]

    expect(buildCockpitStats(rows, now)).toMatchObject({
      late: 1,
      upcoming: 0,
      active: 0,
    })
  })
})

describe('bookingListStatus', () => {
  it('returns payment when paymentPending is true', () => {
    const now = new Date()
    expect(
      bookingListStatus(
        {
          id: '1',
          confirmationCode: 'RZL1',
          startTime: now,
          endTime: now,
          bowlerCount: 1,
          laneCount: 1,
          customerName: 'A',
          customerEmail: 'a@example.com',
          customerPhone: null,
          status: 'CONFIRMED',
          source: 'PHONE',
          packageName: 'Corp',
          totalAmount: 100,
          isRefunded: false,
        },
        now,
        true,
      ),
    ).toBe('payment')
  })

  it('returns late after the grace period', () => {
    const start = new Date('2026-05-16T14:00:00')
    const now = new Date('2026-05-16T14:06:00')
    expect(
      bookingListStatus(
        {
          id: '1',
          confirmationCode: 'RZL1',
          startTime: start,
          endTime: new Date('2026-05-16T15:00:00'),
          bowlerCount: 4,
          laneCount: 1,
          customerName: 'Late',
          customerEmail: 'a@example.com',
          customerPhone: null,
          status: 'CONFIRMED',
          source: 'ONLINE',
          packageName: 'Open Bowl',
          totalAmount: 100,
          isRefunded: false,
        },
        now,
      ),
    ).toBe('late')
  })
})

describe('buildCockpitTimeline', () => {
  it('places blocks on assigned lanes within the window', () => {
    const now = new Date('2026-05-16T14:14:00')
    const rows = [
      booking({
        id: 'active',
        startTime: new Date('2026-05-16T14:00:00'),
        endTime: new Date('2026-05-16T15:00:00'),
        status: 'CONFIRMED',
        laneNumbers: [2],
        customerName: 'Sarah Johnson',
      }),
    ]
    const blocks: BlockedSlotRow[] = [
      {
        id: 'b1',
        startTime: new Date('2026-05-16T14:00:00'),
        endTime: new Date('2026-05-16T18:00:00'),
        reason: 'Maintenance',
        lanes: [6],
      },
    ]

    const timeline = buildCockpitTimeline(6, rows, blocks, now, 4)
    expect(timeline.lanes).toHaveLength(6)
    expect(timeline.lanes[1]?.blocks[0]?.state).toBe('occupied')
    expect(timeline.lanes[5]?.blocked?.reason).toBe('Maintenance')
    expect(timeline.hourLabels.some((h) => h.isNow)).toBe(true)
  })
})

describe('filterCockpitBookings', () => {
  it('matches phone numbers', () => {
    const rows = [
      booking({
        id: '1',
        startTime: new Date(),
        endTime: new Date(),
        status: 'CONFIRMED',
        customerPhone: '(803) 555-0147',
      }),
    ]
    expect(filterCockpitBookings(rows, '555-0147')).toHaveLength(1)
  })
})

describe('buildCockpitHourlyBookings', () => {
  it('counts remaining-day bookings that overlap each hour', () => {
    const now = new Date('2026-05-16T14:30:00')
    const rows = [
      booking({
        id: '1',
        startTime: new Date('2026-05-16T14:00:00'),
        endTime: new Date('2026-05-16T16:00:00'),
        status: 'CONFIRMED',
      }),
      booking({
        id: '2',
        startTime: new Date('2026-05-16T16:00:00'),
        endTime: new Date('2026-05-16T17:00:00'),
        status: 'CANCELLED',
      }),
    ]
    const points = buildCockpitHourlyBookings(rows, now)
    expect(points[0]?.hour).toMatch(/2/)
    expect(points[0]?.count).toBe(1)
    expect(points[2]?.count).toBe(0)
  })
})
