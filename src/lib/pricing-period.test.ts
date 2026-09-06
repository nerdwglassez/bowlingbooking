import { describe, expect, it } from 'vitest'

import type { PricingPeriod } from '@/generated/prisma/client'

import {
  parseClockMinutes,
  periodMatchesClock,
  resolvePricingPeriod,
} from './pricing-period'

function period(
  overrides: Partial<PricingPeriod> & Pick<PricingPeriod, 'id' | 'name'>,
): PricingPeriod {
  return {
    tenantId: 'tenant-1',
    ratePerPersonPerHour: 1200,
    daysOfWeek: [],
    startTime: null,
    endTime: null,
    specificDates: [],
    priority: 0,
    ...overrides,
  }
}

/** Friday 5 Jun 2026 16:00 local — before the UI default peak window. */
const fridayAfternoon = new Date(2026, 5, 5, 16, 0, 0)
/** Friday 5 Jun 2026 18:00 local — inside 17:00–22:00. */
const fridayEvening = new Date(2026, 5, 5, 18, 0, 0)
/** Wednesday 3 Jun 2026 18:00 local. */
const wednesdayEvening = new Date(2026, 5, 3, 18, 0, 0)

const peakEvenings = period({
  id: 'peak',
  name: 'Peak evenings',
  ratePerPersonPerHour: 1200,
  daysOfWeek: [5, 6],
  startTime: '17:00',
  endTime: '22:00',
  priority: 1,
})

describe('parseClockMinutes', () => {
  it('parses HH:MM', () => {
    expect(parseClockMinutes('17:00')).toBe(17 * 60)
    expect(parseClockMinutes('9:30')).toBe(9 * 60 + 30)
  })

  it('returns null for empty or invalid values', () => {
    expect(parseClockMinutes(null)).toBeNull()
    expect(parseClockMinutes('')).toBeNull()
    expect(parseClockMinutes('25:00')).toBeNull()
    expect(parseClockMinutes('noon')).toBeNull()
  })
})

describe('periodMatchesClock', () => {
  it('treats null bounds as all day', () => {
    expect(
      periodMatchesClock({ startTime: null, endTime: null }, fridayAfternoon),
    ).toBe(true)
  })

  it('uses a half-open [start, end) window', () => {
    const window = { startTime: '17:00', endTime: '22:00' }
    expect(periodMatchesClock(window, fridayAfternoon)).toBe(false)
    expect(periodMatchesClock(window, fridayEvening)).toBe(true)
    expect(
      periodMatchesClock(window, new Date(2026, 5, 5, 22, 0, 0)),
    ).toBe(false)
  })
})

describe('resolvePricingPeriod', () => {
  it('returns null when no periods are configured', () => {
    expect(resolvePricingPeriod([], fridayEvening)).toBeNull()
  })

  it('does not apply a peak-evening override to Friday afternoon', () => {
    expect(resolvePricingPeriod([peakEvenings], fridayAfternoon)).toBeNull()
  })

  it('does not apply a Fri/Sat override to Wednesday (uses tenant default)', () => {
    expect(resolvePricingPeriod([peakEvenings], wednesdayEvening)).toBeNull()
  })

  it('applies a peak-evening override inside its window', () => {
    expect(resolvePricingPeriod([peakEvenings], fridayEvening)?.id).toBe('peak')
  })

  it('prefers the higher-priority matching period', () => {
    const allWeek = period({
      id: 'default',
      name: 'Default',
      ratePerPersonPerHour: 850,
      daysOfWeek: [],
      startTime: null,
      endTime: null,
      priority: 0,
    })
    expect(
      resolvePricingPeriod([peakEvenings, allWeek], fridayEvening)?.id,
    ).toBe('peak')
    expect(
      resolvePricingPeriod([peakEvenings, allWeek], fridayAfternoon)?.id,
    ).toBe('default')
    expect(
      resolvePricingPeriod([peakEvenings, allWeek], wednesdayEvening)?.id,
    ).toBe('default')
  })

  it('matches a holiday specificDates row even when daysOfWeek would miss', () => {
    const holiday = period({
      id: 'xmas',
      name: 'Holiday',
      ratePerPersonPerHour: 1500,
      daysOfWeek: [6],
      startTime: null,
      endTime: null,
      specificDates: [new Date(2026, 11, 25)],
      priority: 5,
    })
    const christmas = new Date(2026, 11, 25, 14, 0, 0)
    expect(christmas.getDay()).toBe(5)
    expect(resolvePricingPeriod([holiday], christmas)?.id).toBe('xmas')
  })
})
