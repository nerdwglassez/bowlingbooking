import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** MANAGER/ADMIN only: reject a proposed price override. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('STAFF')
    const { id } = await params
    if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers or admins can reject overrides' }, { status: 403 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.overrideStatus !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'No pending override to reject' },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: {
          overrideStatus: 'REJECTED',
          proposedTotalPrice: null,
          proposedReasonCode: null,
          proposedNotes: null,
          proposedBy: null,
          proposedAt: null,
          overrideApprovedBy: session.userId,
          overrideApprovedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'PRICE_OVERRIDE_REJECTED',
          entityType: 'booking',
          entityId: id,
          userId: session.userId,
          details: JSON.stringify({
            proposedTotal: booking.proposedTotalPrice,
          }),
        },
      }),
    ])

    const updated = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        bookingPackages: { include: { package: true } },
        bookingProducts: { include: { product: true } },
      },
    })

    return NextResponse.json({ booking: updated })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Reject override error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject override' },
      { status: 500 }
    )
  }
}
