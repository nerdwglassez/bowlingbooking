import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

const CHECK_IN_OPEN_HOURS_BEFORE = 6
const CHECK_IN_CLOSE_HOURS_AFTER = 12

function canUseCheckInToken(bookingDate: Date, startTime: string): { ok: boolean; error?: string } {
  const [h, m] = startTime.split(':').map(Number)
  const start = new Date(bookingDate)
  start.setHours(h, m, 0, 0)

  const opensAt = new Date(start.getTime() - CHECK_IN_OPEN_HOURS_BEFORE * 60 * 60 * 1000)
  const closesAt = new Date(start.getTime() + CHECK_IN_CLOSE_HOURS_AFTER * 60 * 60 * 1000)
  const now = new Date()

  if (now < opensAt || now > closesAt) {
    return { ok: false, error: 'Check-in token is outside the allowed time window' }
  }
  return { ok: true }
}

/**
 * GET /api/kiosk/check-in?token=XXX
 * Returns booking summary for kiosk display. No auth. Token-only.
 */
export async function GET(request: NextRequest) {
  try {
    const limiter = checkRateLimit(rateLimitKey(request, 'kiosk-lookup'), 60, 60_000)
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
      )
    }

    const token = request.nextUrl.searchParams.get('token')

    if (!token || !token.trim()) {
      return NextResponse.json(
        { error: 'Missing token parameter' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findFirst({
      where: { checkInToken: token.trim().toUpperCase() },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Booking is not available for check-in', status: booking.status },
        { status: 400 }
      )
    }

    const tokenWindow = canUseCheckInToken(booking.date, booking.startTime)
    if (!tokenWindow.ok) {
      return NextResponse.json({ error: tokenWindow.error }, { status: 400 })
    }

    const lanes = booking.lanes
      ? (JSON.parse(booking.lanes) as number[])
      : [booking.lane]
    const customerName = [booking.user.firstName, booking.user.lastName]
      .filter(Boolean)
      .join(' ') || booking.user.email || 'Guest'

    return NextResponse.json({
      id: booking.id,
      token: booking.checkInToken,
      date: booking.date.toISOString().slice(0, 10),
      startTime: booking.startTime,
      duration: booking.duration,
      lane: booking.lane,
      lanes,
      numBowlers: booking.numBowlers,
      customerName,
      status: booking.status,
    })
  } catch (e) {
    console.error('[kiosk] GET check-in:', e)
    return NextResponse.json(
      { error: 'Failed to load booking' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/kiosk/check-in
 * Body: { token: string }
 * Marks booking as CHECKED_IN. No auth (token is the auth).
 */
export async function POST(request: NextRequest) {
  try {
    const limiter = checkRateLimit(rateLimitKey(request, 'kiosk-checkin'), 30, 60_000)
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim().toUpperCase() : null

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token in body' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findFirst({
      where: { checkInToken: token },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Booking cannot be checked in', status: booking.status },
        { status: 400 }
      )
    }

    const tokenWindow = canUseCheckInToken(booking.date, booking.startTime)
    if (!tokenWindow.ok) {
      return NextResponse.json({ error: tokenWindow.error }, { status: 400 })
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CHECKED_IN' },
    })

    const lanes = booking.lanes
      ? (JSON.parse(booking.lanes) as number[])
      : [booking.lane]

    return NextResponse.json({
      success: true,
      message: "You're checked in!",
      lane: booking.lane,
      lanes,
    })
  } catch (e) {
    console.error('[kiosk] POST check-in:', e)
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    )
  }
}
