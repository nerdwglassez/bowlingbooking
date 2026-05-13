import { describe, expect, it } from 'vitest'

import {
  getLaneAssignmentSummary,
  getLaneCount,
  isEligibleForOnlineBooking,
} from './lane-logic'

describe('getLaneCount', () => {
  it('returns 0 for zero or negative bowlers', () => {
    expect(getLaneCount(0)).toBe(0)
    expect(getLaneCount(-1)).toBe(0)
  })

  it('returns 1 for 1–6 bowlers', () => {
    for (let i = 1; i <= 6; i++) {
      expect(getLaneCount(i)).toBe(1)
    }
  })

  it('returns 2 for 7–12 bowlers (ceiling division)', () => {
    expect(getLaneCount(7)).toBe(2)
    expect(getLaneCount(12)).toBe(2)
  })

  it('returns 3 for 13–18 bowlers (max online range)', () => {
    expect(getLaneCount(13)).toBe(3)
    expect(getLaneCount(18)).toBe(3)
  })

  it('continues to scale linearly above the online cap', () => {
    expect(getLaneCount(19)).toBe(4)
    expect(getLaneCount(60)).toBe(10)
  })
})

describe('isEligibleForOnlineBooking', () => {
  it('rejects zero and negative counts', () => {
    expect(isEligibleForOnlineBooking(0)).toBe(false)
    expect(isEligibleForOnlineBooking(-5)).toBe(false)
  })

  it('accepts the default 1–18 range', () => {
    expect(isEligibleForOnlineBooking(1)).toBe(true)
    expect(isEligibleForOnlineBooking(18)).toBe(true)
  })

  it('rejects counts above the default cap', () => {
    expect(isEligibleForOnlineBooking(19)).toBe(false)
    expect(isEligibleForOnlineBooking(100)).toBe(false)
  })

  it('honors a custom maxOnlineBowlers from tenant config', () => {
    expect(isEligibleForOnlineBooking(24, 24)).toBe(true)
    expect(isEligibleForOnlineBooking(25, 24)).toBe(false)
  })
})

describe('getLaneAssignmentSummary', () => {
  it('uses singular nouns for 1 bowler / 1 lane', () => {
    expect(getLaneAssignmentSummary(1)).toBe('1 lane for 1 bowler')
  })

  it('uses plural lanes with singular bowler when count is just 1', () => {
    expect(getLaneAssignmentSummary(1)).toContain('1 lane ')
  })

  it('pluralizes both nouns for typical groups', () => {
    expect(getLaneAssignmentSummary(7)).toBe('2 lanes for 7 bowlers')
    expect(getLaneAssignmentSummary(12)).toBe('2 lanes for 12 bowlers')
    expect(getLaneAssignmentSummary(13)).toBe('3 lanes for 13 bowlers')
  })
})
