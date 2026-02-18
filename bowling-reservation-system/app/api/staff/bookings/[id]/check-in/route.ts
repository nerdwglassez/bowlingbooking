import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
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
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Only allow check-in for confirmed or paid bookings (not completed, checked-in, or cancelled)
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PAID') {
      const message =
        booking.status === 'COMPLETED'
          ? 'This reservation has been completed and cannot be checked in.'
          : booking.status === 'CHECKED_IN'
            ? 'This reservation is already checked in.'
            : `Cannot check in booking with status: ${booking.status}`
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CHECKED_IN' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ booking: updatedBooking })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Failed to check in customer' },
      { status: 500 }
    )
  }
}


