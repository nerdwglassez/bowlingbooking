import {
  getBookingByLookup,
  type CustomerBookingDetail,
} from '@/lib/actions/customer'
import { RateLimitExceededError } from '@/lib/rate-limit'
import { assertPublicRateLimit } from '@/lib/rate-limit-request'
import { getTenant } from '@/lib/tenant'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatIcsDate(d: Date): string {
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${y}${mo}${day}T${h}${mi}${s}Z`
}

function icsHostname(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) return 'royalz.local'
  try {
    return new URL(raw).hostname || 'royalz.local'
  } catch {
    return 'royalz.local'
  }
}

/** RFC 5545 folding — content lines SHOULD NOT exceed 75 octets (ASCII here). */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line
  const parts = [line.slice(0, 75)]
  let pos = 75
  while (pos < line.length) {
    parts.push('\r\n ' + line.slice(pos, pos + 74))
    pos += 74
  }
  return parts.join('')
}

function buildIcsBody(
  booking: CustomerBookingDetail,
  venueName: string,
  venueAddress: string,
): string {
  const code = booking.confirmationCode.toUpperCase()
  const uid = `${code}@${icsHostname()}`
  const dtstamp = formatIcsDate(new Date())
  const dtstart = formatIcsDate(booking.startTime)
  const dtend = formatIcsDate(booking.endTime)
  const summary = escapeIcs(`Bowling at ${venueName}`)
  const laneWord = booking.laneCount === 1 ? 'lane' : 'lanes'
  const description = escapeIcs(
    `Confirmation: ${booking.confirmationCode}. ${booking.bowlerCount} bowlers on ${booking.laneCount} ${laneWord}. ${booking.packageName}.`,
  )
  const location = escapeIcs(venueAddress)
  const status =
    booking.status === 'CANCELLED' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Royal Z Lanes//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    status,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
): Promise<Response> {
  try {
    await assertPublicRateLimit('booking_ics')
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return new Response('Too many requests', {
        status: 429,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Retry-After': String(err.retryAfterSec),
        },
      })
    }
    throw err
  }

  const emailRaw = new URL(req.url).searchParams.get('email')
  const email = emailRaw?.trim() ?? ''
  if (!email) {
    return new Response('Booking not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const { code } = await ctx.params
  const booking = await getBookingByLookup({
    email,
    confirmationCode: code,
  })
  if (!booking) {
    return new Response('Booking not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const tenant = await getTenant()
  const body = buildIcsBody(booking, tenant.name, tenant.address)
  const fileCode = booking.confirmationCode.toUpperCase()

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="booking-${fileCode}.ics"`,
    },
  })
}
