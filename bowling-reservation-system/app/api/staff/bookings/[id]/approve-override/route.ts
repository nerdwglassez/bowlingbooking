import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** MANAGER/ADMIN only: approve a proposed price override. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('STAFF')
    const { id } = await params
    if (session.role !== 'MANAGER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers or admins can approve overrides' }, { status: 403 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.overrideStatus !== 'PENDING_APPROVAL' || booking.proposedTotalPrice == null) {
      return NextResponse.json(
        { error: 'No pending override to approve' },
        { status: 400 }
      )
    }

    const currentTotal = Number(booking.totalPrice)
    const newTotal = Number(booking.proposedTotalPrice)
    const originalTotal = booking.originalTotalPrice != null
      ? Number(booking.originalTotalPrice)
      : currentTotal

    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: {
          totalPrice: newTotal,
          originalTotalPrice: originalTotal,
          overrideReasonCode: booking.proposedReasonCode,
          overrideNotes: booking.proposedNotes,
          overriddenBy: booking.proposedBy,
          overriddenAt: new Date(),
          overrideStatus: 'APPROVED',
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
          action: 'PRICE_OVERRIDE_APPROVED',
          entityType: 'booking',
          entityId: id,
          userId: session.userId,
          details: JSON.stringify({
            previousTotal: currentTotal,
            newTotal,
            originalTotal,
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
    console.error('Approve override error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve override' },
      { status: 500 }
    )
  }
}
