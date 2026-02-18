import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth()
    const { id } = await params

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingPackages: {
          include: {
            package: true,
          },
        },
        bookingProducts: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if user owns this booking (unless they're staff/admin)
    if (booking.userId !== session.userId && session.role === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json({ booking })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get booking error:', error)
    return NextResponse.json(
      { error: 'Failed to get booking' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if user owns this booking (unless they're staff/admin)
    if (booking.userId !== session.userId && session.role === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Only allow cancellation if booking is not checked in or completed
    if (booking.status === 'CHECKED_IN' || booking.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel a booking that has been checked in or completed' },
        { status: 400 }
      )
    }

    // Self-service cancellation cutoff: 24h before start (staff/admin can cancel anytime)
    const CANCELLATION_CUTOFF_HOURS = 24
    const bookingStart = new Date(`${booking.date.toISOString().slice(0, 10)}T${booking.startTime}`)
    const cutoff = new Date(Date.now() + CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000)
    if (session.role === 'CUSTOMER' && bookingStart <= cutoff) {
      return NextResponse.json(
        { error: `Cancellation must be at least ${CANCELLATION_CUTOFF_HOURS} hours before the booking. Please contact us for help.` },
        { status: 400 }
      )
    }

    const cancelledBooking = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ booking: cancelledBooking })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Cancel booking error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    )
  }
}


