import { Resend } from 'resend'
import { format } from 'date-fns'
import { getIntegrationConfig } from './integration-settings'

const ALLEY_NAME = 'StrikeZone Bowling'
const ALLEY_ADDRESS = '1234 Main St, Brookhaven, GA 30319'
const ALLEY_PHONE = '(555) 123-4567'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export type BookingForEmail = {
  id: string
  date: Date
  startTime: string
  duration: number
  lane: number
  lanes?: number[]
  numBowlers: number
  totalPrice: number
  bookingPackages?: Array<{ package: { name: string; price: number } }>
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}

export type BookingConfirmationEmailOptions = {
  /** Booking is held; payment will be invoiced separately (not marked paid online). */
  invoicePending?: boolean
}

function buildHtml(
  booking: BookingForEmail,
  userEmail: string,
  options?: BookingConfirmationEmailOptions
): string {
  const invoicePending = options?.invoicePending === true
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(booking.id)}`
  const cancelUrl = `${APP_URL}/bookings/${booking.id}`
  const rescheduleUrl = `${APP_URL}/dashboard`

  const packagesHtml =
    booking.bookingPackages && booking.bookingPackages.length > 0
      ? `
    <tr><td colspan="2"><strong>Packages</strong></td></tr>
    ${booking.bookingPackages
      .map(
        (bp) =>
          `<tr><td>${bp.package.name}</td><td>$${Number(bp.package.price).toFixed(2)}</td></tr>`
      )
      .join('')}
  `
      : ''

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  <h1 style="color:#1e40af;">${ALLEY_NAME}</h1>
  <p style="color:#6b7280;">${ALLEY_ADDRESS} · ${ALLEY_PHONE}</p>
  <h2 style="margin-top:24px;">${invoicePending ? 'Booking received — payment pending' : 'Your Booking is Confirmed!'}</h2>
  ${
    invoicePending
      ? `<p style="color:#374151;">We have received your reservation. <strong>Payment is not collected online.</strong> You will receive an invoice (or follow-up) for the amount below. Thank you!</p>`
      : ''
  }
  <div style="border:2px solid #1e40af;padding:16px;margin:16px 0;text-align:center;background:#eff6ff;">
    <p style="margin:0 0 4px 0;font-size:12px;color:#1e40af;">Confirmation code</p>
    <p style="margin:0;font-size:20px;font-weight:bold;letter-spacing:0.05em;word-break:break-all;">${booking.id}</p>
    <p style="margin:12px 0 0 0;"><img src="${qrUrl}" alt="QR code" width="150" height="150" /></p>
  </div>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td><strong>Date</strong></td><td>${format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}</td></tr>
    <tr><td><strong>Time</strong></td><td>${booking.startTime}</td></tr>
    <tr><td><strong>Duration</strong></td><td>${formatDuration(booking.duration)}</td></tr>
    <tr><td><strong>Lane${booking.lanes?.length ? 's' : ''}</strong></td><td>${booking.lanes?.length ? `Lanes ${booking.lanes.join(', ')}` : `Lane ${booking.lane}`}</td></tr>
    <tr><td><strong>Party size</strong></td><td>${booking.numBowlers} bowler${booking.numBowlers !== 1 ? 's' : ''}</td></tr>
    ${packagesHtml}
    <tr><td><strong>${invoicePending ? 'Amount due' : 'Total paid'}</strong></td><td>$${Number(booking.totalPrice).toFixed(2)}</td></tr>
  </table>
  <p style="margin-top:24px;"><strong>Manage your booking</strong></p>
  <p><a href="${cancelUrl}" style="color:#1e40af;">View or cancel this booking</a></p>
  <p><a href="${rescheduleUrl}" style="color:#1e40af;">Reschedule (go to My Bookings)</a></p>
  <p style="margin-top:24px;font-size:12px;color:#6b7280;">Need help? Contact us: ${ALLEY_PHONE} · ${ALLEY_ADDRESS}</p>
  <p style="font-size:12px;color:#9ca3af;">Sent to ${userEmail}</p>
</body>
</html>
`
}

function buildText(
  booking: BookingForEmail,
  userEmail: string,
  options?: BookingConfirmationEmailOptions
): string {
  const invoicePending = options?.invoicePending === true
  const packagesText =
    booking.bookingPackages && booking.bookingPackages.length > 0
      ? '\nPackages: ' +
        booking.bookingPackages.map((bp) => `${bp.package.name} $${Number(bp.package.price).toFixed(2)}`).join(', ')
      : ''
  return `
${ALLEY_NAME}
${ALLEY_ADDRESS}
${ALLEY_PHONE}

${
  invoicePending
    ? 'Booking received — payment pending\n\nWe have received your reservation. Payment is not collected online; you will be invoiced for the amount below.\n'
    : 'Your Booking is Confirmed!\n'
}
Confirmation code: ${booking.id}

Date: ${format(new Date(booking.date), 'EEEE, MMMM d, yyyy')}
Time: ${booking.startTime}
Duration: ${formatDuration(booking.duration)}
Lane${booking.lanes?.length ? 's' : ''}: ${booking.lanes?.length ? booking.lanes.join(', ') : booking.lane}
Party size: ${booking.numBowlers} bowler${booking.numBowlers !== 1 ? 's' : ''}${packagesText}

${invoicePending ? 'Amount due' : 'Total paid'}: $${Number(booking.totalPrice).toFixed(2)}

View or cancel: ${APP_URL}/bookings/${booking.id}
My Bookings: ${APP_URL}/dashboard

Need help? ${ALLEY_PHONE}
Sent to ${userEmail}
`.trim()
}

/** Resend credentials from integration settings (UI) or env. */
async function getResendCredentials(): Promise<{ apiKey: string; from: string } | null> {
  const config = await getIntegrationConfig('resend')
  const apiKey = config?.apiKey || process.env.RESEND_API_KEY
  const from = config?.from || process.env.EMAIL_FROM || 'noreply@localhost'
  if (!apiKey || apiKey.startsWith('re_...')) return null
  return { apiKey, from }
}

/**
 * Send booking confirmation email via Resend.
 * Uses integration config (UI) or RESEND_API_KEY and EMAIL_FROM from env. No-op if not configured.
 */
export async function sendBookingConfirmationEmail(
  booking: BookingForEmail,
  userEmail: string,
  options?: BookingConfirmationEmailOptions
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getResendCredentials()
  if (!creds) {
    console.log('[email] Resend not configured, skipping confirmation email')
    return { ok: true }
  }
  const { apiKey, from } = creds

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [userEmail],
      subject: options?.invoicePending
        ? `Booking received — payment pending (${booking.id})`
        : `Your booking is confirmed – ${booking.id}`,
      html: buildHtml(booking, userEmail, options),
      text: buildText(booking, userEmail, options),
    })

    if (error) {
      console.error('[email] Resend error:', error)
      return { ok: false, error: error.message }
    }
    console.log('[email] Confirmation sent:', data?.id)
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Send failed:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send password reset email via Resend.
 * No-op if Resend not configured (integration config or env).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getResendCredentials()
  if (!creds) {
    console.log('[email] Resend not configured, skipping password reset email')
    return { ok: true }
  }
  const { apiKey, from } = creds

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}" style="color:#1e40af;">Reset password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        <p>— ${ALLEY_NAME}</p>
      `,
      text: `You requested a password reset. Open this link: ${resetLink} (expires in 1 hour). — ${ALLEY_NAME}`,
    })

    if (error) {
      console.error('[email] Password reset send error:', error)
      return { ok: false, error: error.message }
    }
    console.log('[email] Password reset sent:', data?.id)
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Password reset send failed:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send booking reminder email (e.g. 24h before). No-op if Resend not configured.
 */
export async function sendBookingReminderEmail(
  to: string,
  name: string,
  dateStr: string,
  startTime: string,
  bookingId: string
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getResendCredentials()
  if (!creds) {
    console.log('[email] Resend not configured, skipping reminder email')
    return { ok: true }
  }
  const { apiKey, from } = creds

  const displayName = name || 'Customer'
  const viewUrl = `${APP_URL}/bookings/${bookingId}`

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject: `Reminder: Your lane is booked for ${dateStr} at ${startTime}`,
      html: `
        <p>Hi ${displayName},</p>
        <p>This is a reminder that your lane is booked for <strong>${dateStr}</strong> at <strong>${startTime}</strong>.</p>
        <p>Confirmation code: <strong>${bookingId}</strong></p>
        <p><a href="${viewUrl}" style="color:#1e40af;">View booking</a></p>
        <p>— ${ALLEY_NAME}</p>
      `,
      text: `Hi ${displayName}, reminder: your lane is booked for ${dateStr} at ${startTime}. Confirmation: ${bookingId}. View: ${viewUrl} — ${ALLEY_NAME}`,
    })

    if (error) {
      console.error('[email] Reminder send error:', error)
      return { ok: false, error: error.message }
    }
    console.log('[email] Reminder sent:', data?.id)
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Reminder send failed:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send post-visit "thanks for coming" email (marketing automation). No-op if Resend not configured.
 */
export async function sendPostVisitEmail(
  to: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getResendCredentials()
  if (!creds) {
    console.log('[email] Resend not configured, skipping post-visit email')
    return { ok: true }
  }
  const { apiKey, from } = creds

  const displayName = name || 'Customer'
  const bookUrl = `${APP_URL}/book`

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject: `Thanks for bowling with us – book your next visit`,
      html: `
        <p>Hi ${displayName},</p>
        <p>We hope you had a great time at ${ALLEY_NAME}! Ready to book again?</p>
        <p><a href="${bookUrl}" style="color:#1e40af;font-weight:bold;">Book a lane</a></p>
        <p>— ${ALLEY_NAME}</p>
      `,
      text: `Hi ${displayName}, thanks for visiting! Book your next lane: ${bookUrl} — ${ALLEY_NAME}`,
    })

    if (error) {
      console.error('[email] Post-visit send error:', error)
      return { ok: false, error: error.message }
    }
    console.log('[email] Post-visit sent:', data?.id)
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Post-visit send failed:', message)
    return { ok: false, error: message }
  }
}

/**
 * Send lapsed-customer "we miss you" email (marketing automation). No-op if Resend not configured.
 */
export async function sendLapsedCustomerEmail(
  to: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getResendCredentials()
  if (!creds) {
    console.log('[email] Resend not configured, skipping lapsed-customer email')
    return { ok: true }
  }
  const { apiKey, from } = creds

  const displayName = name || 'Customer'
  const bookUrl = `${APP_URL}/book`

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject: `We miss you at ${ALLEY_NAME} – book a lane today`,
      html: `
        <p>Hi ${displayName},</p>
        <p>It's been a while since we've seen you at ${ALLEY_NAME}. Come back and bowl with us!</p>
        <p><a href="${bookUrl}" style="color:#1e40af;font-weight:bold;">Book a lane</a></p>
        <p>— ${ALLEY_NAME}</p>
      `,
      text: `Hi ${displayName}, we miss you! Book a lane: ${bookUrl} — ${ALLEY_NAME}`,
    })

    if (error) {
      console.error('[email] Lapsed-customer send error:', error)
      return { ok: false, error: error.message }
    }
    console.log('[email] Lapsed-customer sent:', data?.id)
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[email] Lapsed-customer send failed:', message)
    return { ok: false, error: message }
  }
}
