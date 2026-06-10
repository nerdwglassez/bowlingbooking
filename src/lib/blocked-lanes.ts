import type { Prisma } from '@/generated/prisma/client'

import {
  sumOverlappingLaneCount,
  type LaneReservationSlot,
} from '@/lib/lane-logic'

export interface BlockedSlotLike {
  startTime: Date
  endTime: Date
  /** Empty array = all lanes blocked. */
  lanes: number[]
}

/** Count distinct lane numbers blocked during [startTime, endTime). */
export function countBlockedLanesForWindow(
  blocks: BlockedSlotLike[],
  startTime: Date,
  endTime: Date,
  totalLanes: number,
): number {
  const overlapping = blocks.filter(
    (block) => block.startTime < endTime && block.endTime > startTime,
  )
  if (overlapping.length === 0) return 0
  if (overlapping.some((block) => block.lanes.length === 0)) return totalLanes

  const blocked = new Set<number>()
  for (const block of overlapping) {
    for (const lane of block.lanes) blocked.add(lane)
  }
  return Math.min(blocked.size, totalLanes)
}

/** Lane numbers unavailable during [startTime, endTime). */
export function blockedLaneNumbersForWindow(
  blocks: BlockedSlotLike[],
  startTime: Date,
  endTime: Date,
  allLaneNumbers: readonly number[],
): Set<number> {
  const overlapping = blocks.filter(
    (block) => block.startTime < endTime && block.endTime > startTime,
  )
  if (overlapping.length === 0) return new Set()

  if (overlapping.some((block) => block.lanes.length === 0)) {
    return new Set(allLaneNumbers)
  }

  const active = new Set(allLaneNumbers)
  const blocked = new Set<number>()
  for (const block of overlapping) {
    for (const lane of block.lanes) {
      if (active.has(lane)) blocked.add(lane)
    }
  }
  return blocked
}

export function sumReservedLanesIncludingBlocks(
  reservations: LaneReservationSlot[],
  blocks: BlockedSlotLike[],
  startTime: Date,
  endTime: Date,
  totalLanes: number,
): number {
  return (
    sumOverlappingLaneCount(reservations, startTime, endTime) +
    countBlockedLanesForWindow(blocks, startTime, endTime, totalLanes)
  )
}

export async function findOverlappingBlockedSlots(
  tx: Prisma.TransactionClient,
  tenantId: string,
  startTime: Date,
  endTime: Date,
): Promise<BlockedSlotLike[]> {
  return tx.blockedSlot.findMany({
    where: {
      tenantId,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: { startTime: true, endTime: true, lanes: true },
  })
}
