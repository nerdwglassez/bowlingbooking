import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format, subDays } from 'date-fns'

/**
 * GET /api/staff/analytics
 * Advanced analytics: no-show rate, revenue by day, bookings by hour, summary insights.
 * Staff/Manager+ only.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const { searchParams } = request.nextUrl
    const daysParam = searchParams.get('days')
    const days = Math.min(Math.max(parseInt(daysParam || '30', 10) || 30, 7), 90)

    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = subDays(end, days)
    start.setHours(0, 0, 0, 0)

    const bookings = await prisma.booking.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        status: true,
        totalPrice: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    const totalRevenue = bookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + Number(b.totalPrice), 0)

    const today = format(new Date(), 'yyyy-MM-dd')
    const now = new Date()
    const pastBookings = bookings.filter((b) => {
      const d = format(new Date(b.date), 'yyyy-MM-dd')
      if (d < today) return true
      if (d > today) return false
      const [h, m] = b.startTime.split(':').map(Number)
      return new Date(b.date).setHours(h, m, 0, 0) < now.getTime()
    })
    const completed = bookings.filter((b) => b.status === 'COMPLETED')
    const cancelled = bookings.filter((b) => b.status === 'CANCELLED')
    const checkedIn = bookings.filter((b) => b.status === 'CHECKED_IN')
    const paidOrConfirmed = bookings.filter((b) => b.status === 'PAID' || b.status === 'CONFIRMED')

    const pastPaidOrConfirmed = pastBookings.filter((b) => b.status === 'PAID' || b.status === 'CONFIRMED')
    const pastShowed = pastBookings.filter((b) => b.status === 'CHECKED_IN' || b.status === 'COMPLETED')
    const noShowCount = pastPaidOrConfirmed.length
    const showedCount = pastShowed.length
    const noShowRate =
      noShowCount + showedCount > 0 ? (noShowCount / (noShowCount + showedCount)) * 100 : 0

    const revenueByDay: Record<string, { revenue: number; count: number }> = {}
    for (const b of bookings) {
      if (b.status === 'CANCELLED') continue
      const d = format(new Date(b.date), 'yyyy-MM-dd')
      if (!revenueByDay[d]) revenueByDay[d] = { revenue: 0, count: 0 }
      revenueByDay[d].revenue += Number(b.totalPrice)
      revenueByDay[d].count += 1
    }
    const revenueByDayArray = Object.entries(revenueByDay)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const byHour: Record<number, number> = {}
    for (let h = 0; h < 24; h++) byHour[h] = 0
    for (const b of bookings) {
      if (b.status === 'CANCELLED') continue
      const hour = parseInt(b.startTime.slice(0, 2), 10)
      byHour[hour] = (byHour[hour] || 0) + 1
    }
    const bookingsByHour = Object.entries(byHour).map(([hour, count]) => ({
      hour: parseInt(hour, 10),
      count,
    }))

    const avgRevenuePerDay =
      revenueByDayArray.length > 0
        ? revenueByDayArray.reduce((s, d) => s + d.revenue, 0) / revenueByDayArray.length
        : 0
    const peakDay =
      revenueByDayArray.length > 0
        ? revenueByDayArray.reduce((a, b) => (a.revenue >= b.revenue ? a : b), revenueByDayArray[0])
        : null

    return NextResponse.json({
      from: format(start, 'yyyy-MM-dd'),
      to: format(end, 'yyyy-MM-dd'),
      days,
      totalBookings: bookings.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      byStatus: {
        completed: completed.length,
        cancelled: cancelled.length,
        checkedIn: checkedIn.length,
        paidOrConfirmed: paidOrConfirmed.length,
      },
      noShowRate: Math.round(noShowRate * 10) / 10,
      noShowCount,
      showedCount: pastShowed.length,
      revenueByDay: revenueByDayArray,
      bookingsByHour,
      insights: {
        avgRevenuePerDay: Math.round(avgRevenuePerDay * 100) / 100,
        peakDay: peakDay ? { date: peakDay.date, revenue: peakDay.revenue, count: peakDay.count } : null,
      },
    })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'message' in e && (e as { message: string }).message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Analytics error:', e)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
