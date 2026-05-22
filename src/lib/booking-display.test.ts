import { describe, expect, it } from 'vitest'

import { formatTimeSlotAvailabilityCaption } from './booking-display'
import type { TimeSlot } from '@/types'

function slot(partial: Partial<TimeSlot> & Pick<TimeSlot, 'id' | 'available'>): TimeSlot {
  const start = new Date('2026-01-01T18:00:00')
  const end = new Date('2026-01-01T19:00:00')
  return {
    startTime: start,
    endTime: end,
    laneNumbers: [],
    lanesFree: 0,
    spotsRemaining: 0,
    ...partial,
  }
}

describe('formatTimeSlotAvailabilityCaption', () => {
  it('shows Held for the selected slot', () => {
    const s = slot({
      id: 'a',
      available: true,
      lanesFree: 4,
      spotsRemaining: 4,
    })
    expect(formatTimeSlotAvailabilityCaption(s, 'a')).toBe('✓ Held')
    expect(formatTimeSlotAvailabilityCaption(s, null)).toBe('Open')
  })

  it('shows Full when unavailable', () => {
    const s = slot({ id: 'x', available: false, lanesFree: 0, spotsRemaining: 0 })
    expect(formatTimeSlotAvailabilityCaption(s, null)).toBe('Full')
  })

  it('uses Open when enough party spots remain', () => {
    const s = slot({ id: 'x', available: true, lanesFree: 8, spotsRemaining: 3 })
    expect(formatTimeSlotAvailabilityCaption(s, null)).toBe('Open')
    expect(
      formatTimeSlotAvailabilityCaption(
        { ...s, spotsRemaining: 4 },
        null,
      ),
    ).toBe('Open')
  })

  it('uses N left for scarce slots', () => {
    expect(
      formatTimeSlotAvailabilityCaption(
        slot({ id: 'x', available: true, lanesFree: 2, spotsRemaining: 2 }),
        null,
      ),
    ).toBe('2 left')
    expect(
      formatTimeSlotAvailabilityCaption(
        slot({ id: 'x', available: true, lanesFree: 1, spotsRemaining: 1 }),
        null,
      ),
    ).toBe('1 left')
  })
})
