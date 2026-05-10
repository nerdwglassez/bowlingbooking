import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isTimeSlotAvailable } from '@/lib/availability'
import { buildBookingLaneAssignment, parsePersistedBookingLanes } from '@/lib/booking/lanes'
import { parse } from 'date-fns'
import { z } from 'zod'

const RESCHEDULE_CUTOFF_HOURS = 24 // No self-service reschedule within 24h of start

const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.userId !== session.userId && session.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const allowedStatuses = ['PENDING', 'PAID', 'CONFIRMED']
    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: 'This booking cannot be rescheduled' },
        { status: 400 }
      )
    }

    // Cutoff: no self-service reschedule within 24h of start (staff/admin can bypass)
    const bookingStart = new Date(`${booking.date.toISOString().slice(0, 10)}T${booking.startTime}`)
    const cutoff = new Date(Date.now() + RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000)
    if (session.role === 'CUSTOMER' && bookingStart <= cutoff) {
      return NextResponse.json(
        { error: `Reschedule must be at least ${RESCHEDULE_CUTOFF_HOURS} hours before the booking. Please contact us for help.` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const parsed = rescheduleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid date or time', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const newDate = parse(parsed.data.date, 'yyyy-MM-dd', new Date())

    const availability = await isTimeSlotAvailable(
      newDate,
      parsed.data.startTime,
      booking.duration
    )

    const existingLanes = parsePersistedBookingLanes(booking)
    const laneAssignment = buildBookingLaneAssignment(availability.availableLanes, existingLanes.length)

    if (!availability.available || !laneAssignment) {
      return NextResponse.json(
        {
          error:
            existingLanes.length > 1
              ? `The selected time slot does not have ${existingLanes.length} lanes available`
              : 'The selected time slot is no longer available',
        },
        { status: 400 }
      )
    }

    const previousDate = booking.date
    const previousStartTime = booking.startTime

    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: {
          date: newDate,
          startTime: parsed.data.startTime,
          lane: laneAssignment.lane,
          lanes: laneAssignment.lanes,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'RESCHEDULE',
          entityType: 'booking',
          entityId: id,
          userId: session.userId,
          details: JSON.stringify({
            previousDate: previousDate.toISOString().slice(0, 10),
            previousStartTime,
            previousLanes: existingLanes,
            newDate: parsed.data.date,
            newStartTime: parsed.data.startTime,
            newLanes: laneAssignment.laneNumbers,
          }),
        },
      }),
    ])

    const updated = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingPackages: { include: { package: true } },
        user: { select: { id: true, email: true } },
      },
    })

    return NextResponse.json({ booking: updated })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Reschedule booking error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reschedule' },
      { status: 500 }
    )
  }
}
