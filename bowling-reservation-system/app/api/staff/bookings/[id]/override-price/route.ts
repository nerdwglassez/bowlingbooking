import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const OVERRIDE_REASON_CODES = ['DISCOUNT', 'COMP', 'MANAGER_OVERRIDE', 'GROUP_RATE', 'OTHER'] as const

const overridePriceSchema = z.object({
  newTotal: z.number().positive('Total must be positive'),
  reasonCode: z.enum(OVERRIDE_REASON_CODES, { errorMap: () => ({ message: 'Invalid reason code' }) }),
  notes: z.string().max(500).optional(),
})

/** STAFF: propose override (pending manager approval). MANAGER/ADMIN: apply immediately. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('STAFF')
    const { id } = await params

    const booking = await prisma.booking.findUnique({
      where: { id },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = overridePriceSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const currentTotal = Number(booking.totalPrice)
    const newTotal = parsed.data.newTotal

    if (newTotal === currentTotal) {
      return NextResponse.json(
        { error: 'New total must differ from current total' },
        { status: 400 }
      )
    }

    const isManagerOrAdmin = session.role === 'MANAGER' || session.role === 'ADMIN'
    const originalTotal = booking.originalTotalPrice != null
      ? Number(booking.originalTotalPrice)
      : currentTotal

    if (isManagerOrAdmin) {
      // Apply override immediately
      await prisma.$transaction([
        prisma.booking.update({
          where: { id },
          data: {
            totalPrice: newTotal,
            originalTotalPrice: originalTotal,
            overrideReasonCode: parsed.data.reasonCode,
            overrideNotes: parsed.data.notes ?? null,
            overriddenBy: session.userId,
            overriddenAt: new Date(),
            overrideStatus: 'APPROVED',
            proposedTotalPrice: null,
            proposedReasonCode: null,
            proposedNotes: null,
            proposedBy: null,
            proposedAt: null,
            overrideApprovedBy: null,
            overrideApprovedAt: null,
          },
        }),
        prisma.auditLog.create({
          data: {
            action: 'PRICE_OVERRIDE',
            entityType: 'booking',
            entityId: id,
            userId: session.userId,
            details: JSON.stringify({
              reasonCode: parsed.data.reasonCode,
              notes: parsed.data.notes,
              previousTotal: currentTotal,
              newTotal,
              originalTotal,
            }),
          },
        }),
      ])
    } else {
      // STAFF: propose for manager approval
      await prisma.$transaction([
        prisma.booking.update({
          where: { id },
          data: {
            overrideStatus: 'PENDING_APPROVAL',
            proposedTotalPrice: newTotal,
            proposedReasonCode: parsed.data.reasonCode,
            proposedNotes: parsed.data.notes ?? null,
            proposedBy: session.userId,
            proposedAt: new Date(),
          },
        }),
        prisma.auditLog.create({
          data: {
            action: 'PRICE_OVERRIDE_PROPOSED',
            entityType: 'booking',
            entityId: id,
            userId: session.userId,
            details: JSON.stringify({
              reasonCode: parsed.data.reasonCode,
              notes: parsed.data.notes,
              currentTotal,
              proposedTotal: newTotal,
            }),
          },
        }),
      ])
    }

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
    console.error('Override price error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to override price' },
      { status: 500 }
    )
  }
}
