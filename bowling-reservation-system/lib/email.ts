import { Resend } from 'resend'
import { getIntegrationConfig } from './integration-settings'
import {
  ALLEY_NAME,
  getAppUrl,
  getBookingConfirmationSubject,
  buildBookingConfirmationHtml,
  buildBookingConfirmationText,
  getPasswordResetSubject,
  buildPasswordResetHtml,
  buildPasswordResetText,
  getBookingReminderSubject,
  buildBookingReminderHtml,
  buildBookingReminderText,
  getPostVisitSubject,
  buildPostVisitHtml,
  buildPostVisitText,
  getLapsedCustomerSubject,
  buildLapsedCustomerHtml,
  buildLapsedCustomerText,
  type BookingForEmail,
  type BookingConfirmationEmailOptions,
} from './email-templates'

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
      subject: getBookingConfirmationSubject(booking, options),
      html: buildBookingConfirmationHtml(booking, userEmail, options),
      text: buildBookingConfirmationText(booking, userEmail, options),
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
    const subject = getPasswordResetSubject()
    const html = buildPasswordResetHtml(resetLink)
    const text = buildPasswordResetText(resetLink)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject,
      html,
      text,
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

  const viewUrl = `${getAppUrl()}/bookings/${bookingId}`

  try {
    const resend = new Resend(apiKey)
    const subject = getBookingReminderSubject(dateStr, startTime)
    const html = buildBookingReminderHtml({ name, dateStr, startTime, bookingId, viewUrl })
    const text = buildBookingReminderText({ name, dateStr, startTime, bookingId, viewUrl })
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject,
      html,
      text,
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

  const bookUrl = `${getAppUrl()}/book`

  try {
    const resend = new Resend(apiKey)
    const subject = getPostVisitSubject()
    const html = buildPostVisitHtml(name, bookUrl)
    const text = buildPostVisitText(name, bookUrl)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject,
      html,
      text,
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

  try {
    const resend = new Resend(apiKey)
    const subject = getLapsedCustomerSubject()
    const html = buildLapsedCustomerHtml(name)
    const text = buildLapsedCustomerText(name)
    const { data, error } = await resend.emails.send({
      from: `${ALLEY_NAME} <${from}>`,
      to: [to],
      subject,
      html,
      text,
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
