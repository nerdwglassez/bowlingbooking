import { describe, expect, it } from 'vitest'

import {
  computeDelta,
  contactIdFromEmail,
  contactInitials,
  emailFromContactId,
  filterContacts,
  filterContactsByPackage,
  formatContactTableDate,
  formatCustomerSince,
  formatHistoryDate,
  normalizeStaffReportsPeriod,
  resolveStaffReportsWindow,
  sortContacts,
  uniqueContactPackages,
} from '@/lib/reports-display'

describe('reports-display', () => {
  it('normalizes period input', () => {
    expect(normalizeStaffReportsPeriod('today')).toBe('today')
    expect(normalizeStaffReportsPeriod('week')).toBe('week')
    expect(normalizeStaffReportsPeriod(undefined)).toBe('month')
    expect(normalizeStaffReportsPeriod('nope')).toBe('month')
  })

  it('builds contact initials', () => {
    expect(contactInitials('Sarah Johnson')).toBe('SJ')
    expect(contactInitials('Madonna')).toBe('MA')
  })

  it('round-trips contact ids from email', () => {
    const id = contactIdFromEmail('Jordan@Example.com')
    expect(emailFromContactId(id)).toBe('jordan@example.com')
  })

  it('computes delta direction', () => {
    expect(computeDelta(120, 100, 'vs last month')).toEqual({
      direction: 'up',
      percent: 20,
      comparisonLabel: 'vs last month',
    })
    expect(computeDelta(80, 100, 'vs last month')).toEqual({
      direction: 'down',
      percent: 20,
      comparisonLabel: 'vs last month',
    })
  })

  it('filters contacts by name, email, and phone', () => {
    const rows = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah@email.com',
        phone: '(803) 555-0147',
        bookingCount: 1,
        lastBookingDate: '2026-05-11T00:00:00.000Z',
        packageNames: ['Open Bowl'],
      },
    ]
    expect(filterContacts(rows, 'johnson')).toHaveLength(1)
    expect(filterContacts(rows, '555-0147')).toHaveLength(1)
    expect(filterContacts(rows, 'missing')).toHaveLength(0)
  })

  it('filters and sorts contacts for the table', () => {
    const rows = [
      {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah@email.com',
        phone: null,
        bookingCount: 7,
        lastBookingDate: '2026-05-11T00:00:00.000Z',
        packageNames: ['Open Bowl'],
      },
      {
        id: '2',
        name: 'Marcus Williams',
        email: 'marcus@email.com',
        phone: null,
        bookingCount: 2,
        lastBookingDate: '2026-05-12T00:00:00.000Z',
        packageNames: ['Cosmic Bowl'],
      },
    ]
    expect(filterContactsByPackage(rows, 'Cosmic Bowl')).toHaveLength(1)
    expect(uniqueContactPackages(rows)).toEqual(['Cosmic Bowl', 'Open Bowl'])
    expect(
      sortContacts(rows, { column: 'bookings', direction: 'descending' })[0]
        .bookingCount,
    ).toBe(7)
    expect(formatContactTableDate('2027-01-11T12:00:00.000Z')).toMatch(
      /Jan 11, 2027/,
    )
    expect(formatCustomerSince('2026-03-01T12:00:00.000Z')).toMatch(/Mar 2026/)
    expect(formatHistoryDate('2027-01-11T19:00:00.000Z')).toMatch(/Jan 11/)
  })

  it('resolves month window with previous month', () => {
    const now = new Date('2026-05-29T12:00:00.000Z')
    const window = resolveStaffReportsWindow('month', undefined, undefined, now)
    expect(window.startDate.toISOString().slice(0, 10)).toBe('2026-05-01')
    expect(window.previousStart.toISOString().slice(0, 10)).toBe('2026-04-01')
  })
})
