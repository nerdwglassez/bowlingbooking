import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addHours, format } from 'date-fns'
import { sendBookingReminderEmail } from '@/lib/email'
import { sendBookingReminderSms } from '@/lib/sms'

const REMINDER_HOURS_BEFORE = 24
const WINDOW_HOURS = 1 // Send reminders for bookings starting in 23–25h from now

/**
 * Cron job: send 24h-before reminders for upcoming bookings.
 * Call with Authorization: Bearer <CRON_SECRET> or x-cron-secret header.
 * Vercel Cron: add to vercel.json "crons": [{ "path": "/api/cron/send-reminders", "schedule": "0 * * * *" }]
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron] CRON_SECRET is not configured; refusing to run send-reminders')
    return NextResponse.json({ error: 'Cron secret is not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : headerSecret

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const windowStart = addHours(now, REMINDER_HOURS_BEFORE - WINDOW_HOURS / 2)
    const windowEnd = addHours(now, REMINDER_HOURS_BEFORE + WINDOW_HOURS / 2)

    const candidateStart = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate())
    const candidateEnd = new Date(windowEnd.getFullYear(), windowEnd.getMonth(), windowEnd.getDate())

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['PAID', 'CONFIRMED'] },
        reminderSentAt: null,
        date: {
          gte: candidateStart,
          lte: candidateEnd,
        },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    })

    let sent = 0
    for (const booking of bookings) {
      const bookingStart = new Date(`${booking.date.toISOString().slice(0, 10)}T${booking.startTime}`)
      const hoursFromNow = (bookingStart.getTime() - now.getTime()) / (60 * 60 * 1000)
      if (hoursFromNow < REMINDER_HOURS_BEFORE - 0.5 || hoursFromNow > REMINDER_HOURS_BEFORE + 0.5) continue

      const dateStr = format(booking.date, 'yyyy-MM-dd')
      const name = booking.user.firstName || booking.user.lastName || 'Customer'

      if (booking.user.email) {
        await sendBookingReminderEmail(
          booking.user.email,
          name,
          dateStr,
          booking.startTime,
          booking.id
        ).catch((err) => console.error('[cron] Reminder email failed:', err))
      }
      if (booking.user.phone) {
        await sendBookingReminderSms(
          booking.user.phone,
          dateStr,
          booking.startTime,
          booking.id
        ).catch((err) => console.error('[cron] Reminder SMS failed:', err))
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      })
      sent++
    }

    return NextResponse.json({ ok: true, sent })
  } catch (error: any) {
    console.error('[cron] Send reminders error:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders', details: error.message },
      { status: 500 }
    )
  }
}
