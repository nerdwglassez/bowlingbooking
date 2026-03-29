import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BookingStatus } from '@/generated/prisma/client'
import { z } from 'zod'

const updateSchema = z.object({
  numBowlers: z.number().int().min(1).max(24).optional(),
  lanes: z.string().optional(), // comma-separated e.g. "5,6"
  status: z.nativeEnum(BookingStatus).optional(),
})

/** PATCH: staff update booking (numBowlers, lanes, status). Use reschedule API for date/time. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('STAFF')
    const { id } = await params

    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data: { numBowlers?: number; lanes?: string | null; status?: BookingStatus } = {}
    if (parsed.data.numBowlers != null) data.numBowlers = parsed.data.numBowlers
    if (parsed.data.lanes !== undefined) {
      const csv = parsed.data.lanes.trim()
      if (csv === '') {
        data.lanes = null
      } else {
        const arr = csv.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n))
        data.lanes = arr.length > 0 ? JSON.stringify(arr) : null
      }
    }
    if (parsed.data.status != null) data.status = parsed.data.status

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ booking }, { status: 200 })
    }

    const updated = await prisma.booking.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        bookingPackages: { include: { package: true } },
      },
    })

    return NextResponse.json({ booking: updated })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Staff update booking error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update booking' },
      { status: 500 }
    )
  }
}
