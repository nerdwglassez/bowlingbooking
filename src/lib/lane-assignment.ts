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

  const occupied = new Set<number>()
  for (const booking of overlapping) {
    if (booking.lanes.length > 0) {
      for (const link of booking.lanes) {
        occupied.add(link.lane.number)
      }
    }
  }

  const pickedNumbers: number[] = []
  for (const lane of lanes) {
    if (pickedNumbers.length >= input.laneCount) break
    if (!occupied.has(lane.number)) pickedNumbers.push(lane.number)
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

/**
 * Replace a booking's persisted lane links after its time or lane count changes.
 */
export async function reassignBookingLanes(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string
    bookingId: string
    laneCount: number
    startTime: Date
    endTime: Date
  },
): Promise<number[]> {
  await tx.bookingLane.deleteMany({ where: { bookingId: input.bookingId } })
  return assignBookingLanes(tx, input)
}
