import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** STAFF: list bookings with pending price override (for manager approval). */
export async function GET() {
  try {
    await requireAuth('STAFF')

    const bookings = await prisma.booking.findMany({
      where: { overrideStatus: 'PENDING_APPROVAL' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        bookingPackages: { include: { package: true } },
        bookingProducts: { include: { product: true } },
      },
      orderBy: [{ proposedAt: 'asc' }],
    })

    return NextResponse.json({ bookings })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Pending overrides error:', error)
    return NextResponse.json(
      { error: 'Failed to load pending overrides' },
      { status: 500 }
    )
  }
}
