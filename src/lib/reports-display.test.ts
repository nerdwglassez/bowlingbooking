import { describe, expect, it } from 'vitest'

import {
  computeDelta,
  contactIdFromEmail,
  contactInitials,
  emailFromContactId,
  filterContacts,
  normalizeStaffReportsPeriod,
  resolveStaffReportsWindow,
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
      },
    ]
    expect(filterContacts(rows, 'johnson')).toHaveLength(1)
    expect(filterContacts(rows, '555-0147')).toHaveLength(1)
    expect(filterContacts(rows, 'missing')).toHaveLength(0)
  })

  it('resolves month window with previous month', () => {
    const now = new Date('2026-05-29T12:00:00.000Z')
    const window = resolveStaffReportsWindow('month', undefined, undefined, now)
    expect(window.startDate.toISOString().slice(0, 10)).toBe('2026-05-01')
    expect(window.previousStart.toISOString().slice(0, 10)).toBe('2026-04-01')
  })
})
