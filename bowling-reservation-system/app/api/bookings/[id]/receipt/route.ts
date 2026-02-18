import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'

/**
 * GET /api/bookings/[id]/receipt
 * Returns a PDF receipt for the booking. Customer must own the booking (or be staff/admin).
 */
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
        bookingPackages: { include: { package: true } },
        bookingProducts: { include: { product: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.userId !== session.userId && session.role === 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    const name = [booking.user?.firstName, booking.user?.lastName].filter(Boolean).join(' ') || 'Guest'

    doc.setFontSize(18)
    doc.text('Booking Receipt', 20, y)
    y += 10

    doc.setFontSize(10)
    doc.text(`Booking ID: ${booking.id}`, 20, y)
    y += 6
    doc.text(`Date: ${format(new Date(booking.date), 'MMM d, yyyy')} at ${booking.startTime}`, 20, y)
    y += 6
    doc.text(`Duration: ${booking.duration / 60} hour(s)`, 20, y)
    y += 6
    const laneStr = booking.lanes
      ? `Lanes ${(JSON.parse(booking.lanes) as number[]).join(', ')}`
      : `Lane ${booking.lane}`
    doc.text(laneStr, 20, y)
    y += 6
    doc.text(`Bowlers: ${booking.numBowlers}`, 20, y)
    y += 6
    doc.text(`Customer: ${name}`, 20, y)
    y += 10

    if (booking.bookingPackages.length > 0) {
      doc.setFontSize(12)
      doc.text('Packages', 20, y)
      y += 6
      doc.setFontSize(10)
      for (const bp of booking.bookingPackages) {
        doc.text(`  ${bp.package.name}  $${Number(bp.package.price).toFixed(2)}`, 20, y)
        y += 5
      }
      y += 4
    }

    if (booking.bookingProducts.length > 0) {
      doc.setFontSize(12)
      doc.text('Add-ons', 20, y)
      y += 6
      doc.setFontSize(10)
      for (const bp of booking.bookingProducts) {
        const line = `  ${bp.product.name} x${bp.quantity}  $${(Number(bp.product.price) * bp.quantity).toFixed(2)}`
        doc.text(line, 20, y)
        y += 5
      }
      y += 4
    }

    doc.setFontSize(12)
    doc.text(`Total: $${Number(booking.totalPrice).toFixed(2)}`, 20, y + 4)
    y += 14

    doc.setFontSize(9)
    doc.text('Thank you for your booking.', 20, y)
    doc.text('StrikeZone Bowling', 20, y + 5)

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${booking.id}.pdf"`,
      },
    })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'message' in e && (e as { message: string }).message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Receipt PDF error:', e)
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 })
  }
}
