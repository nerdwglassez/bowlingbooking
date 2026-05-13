// email.ts — single entry point for outbound email (Resend) and confirmation
// rendering. Other modules MUST NOT `import 'resend'` directly. Drift
// sentinel enforces this.
//
// Dev-without-Resend: when `RESEND_API_KEY` is missing in a non-production
// environment, `sendBookingConfirmation` logs the email payload to the
// console instead of dispatching. Production refuses to fall back.

import { Resend } from 'resend'
import QRCode from 'qrcode'

import { warnOnce } from '@/lib/env'
import { formatPrice } from '@/lib/pricing'

const APP_FROM_DEFAULT = 'Royal Z Lanes <bookings@royalz.local>'

function resolveResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (key) return new Resend(key)
  if (process.env.NODE_ENV === 'production') return null
  warnOnce(
    'resend-key',
    'RESEND_API_KEY is not set — booking confirmation emails will be ' +
      'logged to the server console only. Set RESEND_API_KEY (re_…) before ' +
      'expecting real delivery.',
  )
  return null
}

export interface BookingConfirmationArgs {
  to: string
  customerName: string
  confirmationCode: string
  startTime: Date
  endTime: Date
  laneCount: number
  bowlerCount: number
  packageName: string
  totalCents: number
  venueName: string
  venueAddress: string
  venuePhone: string
}

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function renderHtml(
  args: BookingConfirmationArgs,
  qrDataUri: string,
): string {
  const dateLine = DATETIME_FORMATTER.format(args.startTime)
  return [
    '<!doctype html>',
    '<html><body style="font-family:system-ui,Helvetica,Arial,sans-serif;line-height:1.5;color:#111">',
    `<h1>You're booked at ${escapeHtml(args.venueName)}</h1>`,
    `<p>Hi ${escapeHtml(args.customerName)}, your reservation is confirmed.</p>`,
    '<table cellpadding="6" style="border-collapse:collapse">',
    `<tr><td><strong>Confirmation</strong></td><td>${escapeHtml(args.confirmationCode)}</td></tr>`,
    `<tr><td><strong>When</strong></td><td>${escapeHtml(dateLine)}</td></tr>`,
    `<tr><td><strong>Package</strong></td><td>${escapeHtml(args.packageName)}</td></tr>`,
    `<tr><td><strong>Bowlers</strong></td><td>${args.bowlerCount} on ${args.laneCount} lane${args.laneCount === 1 ? '' : 's'}</td></tr>`,
    `<tr><td><strong>Total</strong></td><td>${escapeHtml(formatPrice(args.totalCents))}</td></tr>`,
    '</table>',
    '<p><img src="' + qrDataUri + '" alt="Booking QR code" width="160" height="160" /></p>',
    `<p>${escapeHtml(args.venueAddress)} · ${escapeHtml(args.venuePhone)}</p>`,
    '<p style="color:#666;font-size:0.9em">Show this email or the QR code at check-in.</p>',
    '</body></html>',
  ].join('')
}

function renderText(args: BookingConfirmationArgs): string {
  const dateLine = DATETIME_FORMATTER.format(args.startTime)
  return [
    `${args.venueName} — booking confirmed`,
    `Confirmation: ${args.confirmationCode}`,
    `When: ${dateLine}`,
    `Package: ${args.packageName}`,
    `Bowlers: ${args.bowlerCount} on ${args.laneCount} lane${args.laneCount === 1 ? '' : 's'}`,
    `Total: ${formatPrice(args.totalCents)}`,
    '',
    `${args.venueAddress} · ${args.venuePhone}`,
    'Show this confirmation at check-in.',
  ].join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Send the booking confirmation email. Idempotent at the caller level — the
 * webhook handler dedupes Stripe events via the StripeEvent table, so this
 * function is safe to call once per `payment_intent.succeeded` event.
 *
 * Returns the provider message id when sent, or null when running in dev
 * fallback mode (no API key configured).
 */
export async function sendBookingConfirmation(
  args: BookingConfirmationArgs,
): Promise<{ id: string | null }> {
  const qrDataUri = await QRCode.toDataURL(args.confirmationCode, {
    margin: 1,
    width: 320,
  })

  const resend = resolveResend()
  if (!resend) {
    console.log(
      `[email-mock] would send booking confirmation to ${args.to} ` +
        `(code=${args.confirmationCode})`,
    )
    return { id: null }
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || APP_FROM_DEFAULT
  const { data, error } = await resend.emails.send({
    from,
    to: args.to,
    subject: `${args.venueName} — booking confirmed (${args.confirmationCode})`,
    html: renderHtml(args, qrDataUri),
    text: renderText(args),
  })
  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? 'unknown error'}`)
  }
  return { id: data?.id ?? null }
}
