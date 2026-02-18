import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const today = format(new Date(), 'yyyy-MM-dd')

    // Exclude cancelled from dashboard view; they remain in DB for reporting and contact history
    const bookings = await prisma.booking.findMany({
      where: {
        date: new Date(today),
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        bookingPackages: {
          include: {
            package: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json({ bookings, date: today })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get today bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to get today bookings' },
      { status: 500 }
    )
  }
}


