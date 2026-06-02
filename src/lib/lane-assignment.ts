import type { Prisma } from '@prisma/client'

const ACTIVE_BOOKING_STATUSES = [
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
  'PENDING_PAYMENT',
] as const

/**
 * Pick lowest-numbered free lanes and persist BookingLane rows for a booking.
 */
export async function assignBookingLanes(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string
    bookingId: string
    laneCount: number
    startTime: Date
    endTime: Date
    preferredLaneNumbers?: number[]
  },
): Promise<number[]> {
  const lanes = await tx.lane.findMany({
    where: { tenantId: input.tenantId, active: true },
    orderBy: { number: 'asc' },
  })

  const overlapping = await tx.booking.findMany({
    where: {
      tenantId: input.tenantId,
      status: { in: [...ACTIVE_BOOKING_STATUSES] },
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
      id: { not: input.bookingId },
    },
    include: {
      lanes: { include: { lane: { select: { number: true } } } },
    },
  })
  const overlappingBlocks = await tx.blockedSlot.findMany({
    where: {
      tenantId: input.tenantId,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
    select: { lanes: true },
  })

  const occupied = new Set<number>()
  for (const booking of overlapping) {
    if (booking.lanes.length > 0) {
      for (const link of booking.lanes) {
        occupied.add(link.lane.number)
      }
    }
  }
  for (const block of overlappingBlocks) {
    if (block.lanes.length === 0) {
      for (const lane of lanes) occupied.add(lane.number)
      break
    }
    for (const number of block.lanes) occupied.add(number)
  }

  const activeLaneNumbers = new Set(lanes.map((lane) => lane.number))
  let pickedNumbers: number[]

  if (input.preferredLaneNumbers && input.preferredLaneNumbers.length > 0) {
    pickedNumbers = [...new Set(input.preferredLaneNumbers)].sort(
      (a, b) => a - b,
    )
    if (
      pickedNumbers.length !== input.laneCount ||
      pickedNumbers.some(
        (number) => !activeLaneNumbers.has(number) || occupied.has(number),
      )
    ) {
      throw new Error('Selected lanes are no longer available.')
    }
  } else {
    pickedNumbers = []
    for (const lane of lanes) {
      if (pickedNumbers.length >= input.laneCount) break
      if (!occupied.has(lane.number)) pickedNumbers.push(lane.number)
    }
  }

  if (pickedNumbers.length < input.laneCount) {
    throw new Error('Not enough lanes available for assignment.')
  }

  for (const number of pickedNumbers) {
    const laneRow = lanes.find((l) => l.number === number)
    if (!laneRow) continue
    await tx.bookingLane.create({
      data: { bookingId: input.bookingId, laneId: laneRow.id },
    })
  }

  return pickedNumbers
}
