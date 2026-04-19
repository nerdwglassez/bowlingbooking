import { NextRequest, NextResponse } from 'next/server'
import { format, isValid, parse } from 'date-fns'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  buildTimelineEntries,
  detectSchedulingConflicts,
  getTimelineSlots,
  type StaffSchedulingBooking,
} from '@/lib/staff/scheduling'

function parseDateParam(value: string | null): Date | null {
  if (!value) return null
  const parsed = parse(value, 'yyyy-MM-dd', new Date())
  if (!isValid(parsed)) return null
  if (format(parsed, 'yyyy-MM-dd') !== value) return null
  return parsed
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const { searchParams } = request.nextUrl
    const dateParam = searchParams.get('date')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const defaultDay = new Date()
    defaultDay.setHours(0, 0, 0, 0)

    const singleDate = parseDateParam(dateParam)
    const fromDate = parseDateParam(fromParam)
    const toDate = parseDateParam(toParam)

    const from = singleDate ?? fromDate ?? defaultDay
    const to = singleDate ?? toDate ?? from

    if (from > to) {
      return NextResponse.json({ error: 'From date must be on or before to date' }, { status: 400 })
    }

    const slotMinutes = parsePositiveInt(searchParams.get('slotMinutes')) ?? 30
    const startTime = searchParams.get('startTime') ?? undefined
    const endTime = searchParams.get('endTime') ?? undefined

    const bookings = await prisma.booking.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        bookingPackages: { include: { package: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    type ScheduleBookingRow = {
      id: string
      startTime: string
      duration: number
      lane: number
      lanes?: string | null
      status: string
      user: {
        email: string
        firstName?: string | null
        lastName?: string | null
      }
      bookingPackages: Array<{
        package?: {
          name?: string | null
        } | null
      }>
    }

    const normalizedBookings: StaffSchedulingBooking[] = (bookings as ScheduleBookingRow[]).map(
      (booking) => ({
        id: booking.id,
        startTime: booking.startTime,
        duration: booking.duration,
        lane: booking.lane,
        lanes: booking.lanes,
        status: booking.status,
        user: {
          email: booking.user.email,
          firstName: booking.user.firstName,
          lastName: booking.user.lastName,
        },
        bookingPackages: booking.bookingPackages.map((bookingPackage) => ({
          package: { name: bookingPackage.package?.name ?? undefined },
        })),
      })
    )

    const timelineOptions = { startTime, endTime, slotMinutes }
    const slots = getTimelineSlots(timelineOptions)
    const entries = buildTimelineEntries(normalizedBookings, timelineOptions)
    const conflicts = detectSchedulingConflicts(entries)

    return NextResponse.json({
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
      totalBookings: bookings.length,
      bookings,
      timeline: {
        startTime: slots[0]?.startTime ?? startTime ?? '00:00',
        endTime: slots[slots.length - 1]?.endTime ?? endTime ?? '00:00',
        slotMinutes,
        slots,
        entries,
        conflicts,
      },
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Staff schedule error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load staff schedule' },
      { status: 500 }
    )
  }
}
