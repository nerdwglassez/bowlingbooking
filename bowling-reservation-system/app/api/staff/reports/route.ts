import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parse, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const { searchParams } = request.nextUrl
    const fromParam = searchParams.get('from') // YYYY-MM-DD
    const toParam = searchParams.get('to')
    const formatParam = searchParams.get('format') // 'json' | 'csv'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const from = fromParam ? parse(fromParam, 'yyyy-MM-dd', new Date()) : today
    const to = toParam ? parse(toParam, 'yyyy-MM-dd', new Date()) : today

    if (from > to) {
      return NextResponse.json(
        { error: 'From date must be on or before to date' },
        { status: 400 }
      )
    }

    const bookings = await prisma.booking.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, tier: true } },
        bookingPackages: { include: { package: true } },
        bookingProducts: { include: { product: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    const revenue = bookings.reduce((sum, b) => sum + Number(b.totalPrice), 0)

    // Revenue by day for enhanced analytics
    const revenueByDay: Record<string, { date: string; revenue: number; count: number }> = {}
    for (const b of bookings) {
      const dateStr = format(new Date(b.date), 'yyyy-MM-dd')
      if (!revenueByDay[dateStr]) {
        revenueByDay[dateStr] = { date: dateStr, revenue: 0, count: 0 }
      }
      revenueByDay[dateStr].revenue += Number(b.totalPrice)
      revenueByDay[dateStr].count += 1
    }
    const revenueByDayArray = Object.values(revenueByDay).sort(
      (a, b) => a.date.localeCompare(b.date)
    )

    if (formatParam === 'csv') {
      const header = 'Date,Time,Duration,Lane,Customer Email,Customer Tier,Status,Total'
      const rows = bookings.map((b) =>
        [
          format(new Date(b.date), 'yyyy-MM-dd'),
          b.startTime,
          b.duration,
          b.lane,
          b.user.email,
          b.user.tier ?? 'REGULAR',
          b.status,
          Number(b.totalPrice).toFixed(2),
        ].join(',')
      )
      const csv = [header, ...rows].join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="bookings-${format(from, 'yyyy-MM-dd')}-to-${format(to, 'yyyy-MM-dd')}.csv"`,
        },
      })
    }

    return NextResponse.json({
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
      totalBookings: bookings.length,
      revenue: Math.round(revenue * 100) / 100,
      revenueByDay: revenueByDayArray,
      bookings,
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Reports error:', error)
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}
