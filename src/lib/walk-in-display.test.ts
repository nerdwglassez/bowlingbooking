import { describe, expect, it } from 'vitest'

import type { CockpitLaneCard } from '@/lib/actions/staff'
import {
  formatBowlersSummary,
  pickAutoLanes,
  walkInSourceToDb,
} from '@/lib/walk-in-display'

function lane(
  number: number,
  state: CockpitLaneCard['state'],
): CockpitLaneCard {
  return {
    number,
    state,
    statusLabel: state,
  }
}

describe('pickAutoLanes', () => {
  it('selects the first available lanes for bowler count', () => {
    const lanes = [
      lane(1, 'occupied'),
      lane(2, 'available'),
      lane(3, 'available'),
      lane(4, 'blocked'),
    ]
    expect(pickAutoLanes(lanes, 8)).toEqual([2, 3])
  })
})

describe('walkInSourceToDb', () => {
  it('maps walk_in to WALK_IN and phone/advance to PHONE', () => {
    expect(walkInSourceToDb('walk_in')).toBe('WALK_IN')
    expect(walkInSourceToDb('phone')).toBe('PHONE')
    expect(walkInSourceToDb('advance')).toBe('PHONE')
  })
})

describe('formatBowlersSummary', () => {
  it('includes lane count from getLaneCount', () => {
    expect(formatBowlersSummary(4)).toBe('4 bowlers · 1 lane')
    expect(formatBowlersSummary(7)).toBe('7 bowlers · 2 lanes')
  })
})
