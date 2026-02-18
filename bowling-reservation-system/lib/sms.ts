import { getIntegrationConfig } from './integration-settings'

/** Twilio credentials from integration settings (UI) or env. */
async function getTwilioCredentials(): Promise<{
  accountSid: string
  authToken: string
  from: string
} | null> {
  const config = await getIntegrationConfig('twilio')
  const accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID
  const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN
  const from = config?.phoneNumber || process.env.TWILIO_PHONE_NUMBER
  if (!accountSid || !authToken || !from || accountSid.startsWith('AC...')) return null
  return { accountSid, authToken, from }
}

/** Send booking reminder SMS (e.g. 24h before). No-op if Twilio not configured. */
export async function sendBookingReminderSms(
  to: string,
  dateStr: string,
  startTime: string,
  bookingId: string
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getTwilioCredentials()
  if (!creds) {
    console.log('[sms] Twilio not configured, skipping reminder SMS')
    return { ok: true }
  }
  const { accountSid, authToken, from } = creds

  const body = `Reminder: Your lane is booked for ${dateStr} at ${startTime}. Ref: ${bookingId}. See you soon!`

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: body,
      }).toString(),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[sms] Twilio reminder error:', err)
      return { ok: false, error: err }
    }
    console.log('[sms] Reminder SMS sent to', to)
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[sms] Reminder send failed:', message)
    return { ok: false, error: message }
  }
}
