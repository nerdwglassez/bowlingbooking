import { ALLEY_NAME } from './constants'

export function getBookingReminderSubject(dateStr: string, startTime: string): string {
  return `Reminder: Your lane is booked for ${dateStr} at ${startTime}`
}

export function buildBookingReminderHtml(input: {
  name: string
  dateStr: string
  startTime: string
  bookingId: string
  viewUrl: string
}): string {
  const displayName = input.name || 'Customer'
  return `
      <p>Hi ${displayName},</p>
      <p>This is a reminder that your lane is booked for <strong>${input.dateStr}</strong> at <strong>${input.startTime}</strong>.</p>
      <p>Confirmation code: <strong>${input.bookingId}</strong></p>
      <p><a href="${input.viewUrl}" style="color:#1e40af;">View booking</a></p>
      <p>— ${ALLEY_NAME}</p>
    `
}

export function buildBookingReminderText(input: {
  name: string
  dateStr: string
  startTime: string
  bookingId: string
  viewUrl: string
}): string {
  const displayName = input.name || 'Customer'
  return `Hi ${displayName}, reminder: your lane is booked for ${input.dateStr} at ${input.startTime}. Confirmation: ${input.bookingId}. View: ${input.viewUrl} — ${ALLEY_NAME}`
}
