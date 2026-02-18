import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { subDays, addHours } from 'date-fns'
import { sendPostVisitEmail } from '@/lib/email'

const POST_VISIT_HOURS_AFTER = 24 // Send "thanks for visiting" 24h after completed booking
const POST_VISIT_WINDOW_HOURS = 2 // Process bookings that completed 23–25h ago
const LAPSED_DAYS = 30 // No booking in this many days = lapsed
const LAPSED_COOLDOWN_DAYS = 28 // Don't send lapsed email again for this many days after last send

/**
 * Cron: marketing automation (post-visit + lapsed customer).
 * - Post-visit: COMPLETED bookings 24h ago (no postVisitEmailSentAt) → send thanks email, set postVisitEmailSentAt.
 * - Lapsed: customers with newsletterOptIn, no booking in LAPSED_DAYS, lastLapsedEmailSentAt null or > LAPSED_COOLDOWN_DAYS ago → send we-miss-you email.
 * Call with Authorization: Bearer <CRON_SECRET> or x-cron-secret.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron] CRON_SECRET is not configured; refusing to run marketing-automation')
    return NextResponse.json({ error: 'Cron secret is not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : headerSecret

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { postVisit: { sent: 0, errors: 0 }, lapsed: { sent: 0, errors: 0 } }

  try {
    const now = new Date()

    // --- Post-visit: completed bookings whose end time was ~24h ago ---
    const postVisitWindowStart = addHours(now, -POST_VISIT_HOURS_AFTER - POST_VISIT_WINDOW_HOURS / 2)
    const postVisitWindowEnd = addHours(now, -POST_VISIT_HOURS_AFTER + POST_VISIT_WINDOW_HOURS / 2)

    const twoDaysAgo = subDays(now, 2)
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        postVisitEmailSentAt: null,
        date: { gte: twoDaysAgo },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    })

    for (const booking of completedBookings) {
      const [hours, mins] = booking.startTime.split(':').map(Number)
      const bookingEnd = addHours(
        new Date(booking.date.getFullYear(), booking.date.getMonth(), booking.date.getDate(), hours, mins),
        Math.ceil(booking.duration / 60)
      )
      if (bookingEnd < postVisitWindowStart || bookingEnd > postVisitWindowEnd) continue
      if (!booking.user.email) continue
      const name = booking.user.firstName || booking.user.lastName || 'Customer'
      const { ok } = await sendPostVisitEmail(booking.user.email, name).catch(() => ({ ok: false }))
      if (ok) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { postVisitEmailSentAt: new Date() },
        })
        results.postVisit.sent++
      } else {
        results.postVisit.errors++
      }
    }

    // --- Lapsed: customers with newsletter opt-in, no booking in LAPSED_DAYS ---
    const lapsedCutoff = subDays(now, LAPSED_DAYS)
    const cooldownCutoff = subDays(now, LAPSED_COOLDOWN_DAYS)

    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        newsletterOptIn: true,
        email: { not: '' },
        OR: [
          { lastLapsedEmailSentAt: null },
          { lastLapsedEmailSentAt: { lt: cooldownCutoff } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    })

    const { sendLapsedCustomerEmail } = await import('@/lib/email')

    for (const user of customers) {
      const email = user.email!
      const lastBooking = await prisma.booking.findFirst({
        where: {
          userId: user.id,
          status: { not: 'CANCELLED' },
          date: { gte: lapsedCutoff },
        },
        orderBy: { date: 'desc' },
      })
      if (lastBooking) continue // has recent booking

      const name = user.firstName || user.lastName || 'Customer'
      const { ok } = await sendLapsedCustomerEmail(email, name).catch(() => ({ ok: false }))
      if (ok) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLapsedEmailSentAt: new Date() },
        })
        results.lapsed.sent++
      } else {
        results.lapsed.errors++
      }
    }

    return NextResponse.json({ ok: true, ...results })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[cron] Marketing automation error:', message)
    return NextResponse.json(
      { error: 'Marketing automation failed', details: message, ...results },
      { status: 500 }
    )
  }
}
