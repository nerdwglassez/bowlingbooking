import { describe, expect, it } from 'vitest'

import {
  blockedLaneNumbersForWindow,
  countBlockedLanesForWindow,
  sumReservedLanesIncludingBlocks,
} from './blocked-lanes'

const windowStart = new Date('2026-06-01T18:00:00Z')
const windowEnd = new Date('2026-06-01T20:00:00Z')

describe('countBlockedLanesForWindow', () => {
  it('returns 0 when no blocks overlap', () => {
    expect(
      countBlockedLanesForWindow(
        [
          {
            startTime: new Date('2026-06-01T10:00:00Z'),
            endTime: new Date('2026-06-01T12:00:00Z'),
            lanes: [1],
          },
        ],
        windowStart,
        windowEnd,
        8,
      ),
    ).toBe(0)
  })

  it('counts partial lane blocks', () => {
    expect(
      countBlockedLanesForWindow(
        [
          {
            startTime: windowStart,
            endTime: windowEnd,
            lanes: [2, 4],
          },
        ],
        windowStart,
        windowEnd,
        8,
      ),
    ).toBe(2)
  })

  it('treats empty lanes as all lanes blocked', () => {
    expect(
      countBlockedLanesForWindow(
        [{ startTime: windowStart, endTime: windowEnd, lanes: [] }],
        windowStart,
        windowEnd,
        8,
      ),
    ).toBe(8)
  })
})

describe('blockedLaneNumbersForWindow', () => {
  it('returns all active lane numbers for a full-venue block', () => {
    const blocked = blockedLaneNumbersForWindow(
      [{ startTime: windowStart, endTime: windowEnd, lanes: [] }],
      windowStart,
      windowEnd,
      [1, 2, 3],
    )
    expect(blocked).toEqual(new Set([1, 2, 3]))
  })

  it('returns only overlapping partial lane numbers', () => {
    const blocked = blockedLaneNumbersForWindow(
      [{ startTime: windowStart, endTime: windowEnd, lanes: [2, 99] }],
      windowStart,
      windowEnd,
      [1, 2, 3],
    )
    expect(blocked).toEqual(new Set([2]))
  })
})

describe('sumReservedLanesIncludingBlocks', () => {
  it('adds blocked lanes to booking and hold reservations', () => {
    const reserved = sumReservedLanesIncludingBlocks(
      [{ startTime: windowStart, endTime: windowEnd, laneCount: 2 }],
      [{ startTime: windowStart, endTime: windowEnd, lanes: [5] }],
      windowStart,
      windowEnd,
      8,
    )
    expect(reserved).toBe(3)
  })
})
