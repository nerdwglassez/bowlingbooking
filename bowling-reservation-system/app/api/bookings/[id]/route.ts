import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: {
        bookingPackages: {
          include: {
            package: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
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

    // Update status to cancelled instead of deleting
    const cancelledBooking = await prisma.booking.update({
      where: { id: params.id },
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


