import { format } from 'date-fns'
import { ALLEY_NAME, ALLEY_ADDRESS, ALLEY_PHONE, getAppUrl } from './constants'
import { formatDuration } from './utils'
import type { BookingForEmail, BookingConfirmationEmailOptions } from './types'

export function getBookingConfirmationSubject(
  booking: BookingForEmail,
  options?: BookingConfirmationEmailOptions
): string {
  return options?.invoicePending
    ? `Booking received — payment pending (${booking.id})`
    : `Your booking is confirmed – ${booking.id}`
}

export function buildBookingConfirmationHtml(
  booking: BookingForEmail,
  userEmail: string,
  options?: BookingConfirmationEmailOptions
): string {
  const appUrl = getAppUrl()
  const invoicePending = options?.invoicePending === true
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(booking.id)}`
  const cancelUrl = `${appUrl}/bookings/${booking.id}`
  const rescheduleUrl = `${appUrl}/dashboard`

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

export function buildBookingConfirmationText(
  booking: BookingForEmail,
  userEmail: string,
  options?: BookingConfirmationEmailOptions
): string {
  const appUrl = getAppUrl()
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

View or cancel: ${appUrl}/bookings/${booking.id}
My Bookings: ${appUrl}/dashboard

Need help? ${ALLEY_PHONE}
Sent to ${userEmail}
`.trim()
}
