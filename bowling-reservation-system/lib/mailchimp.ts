/**
 * Mailchimp integration for marketing (newsletter / promotions).
 * Syncs contact to audience when user opts in. Uses integration config (UI) or env:
 * MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, MAILCHIMP_SERVER_PREFIX (e.g. us21)
 */

import { getIntegrationConfig } from './integration-settings'

async function getMailchimpConfig(): Promise<{
  apiKey: string
  listId: string
  serverPrefix: string
} | null> {
  const config = await getIntegrationConfig('mailchimp')
  const apiKey = config?.apiKey || process.env.MAILCHIMP_API_KEY
  const listId = config?.listId || process.env.MAILCHIMP_LIST_ID
  const serverPrefix = config?.serverPrefix || process.env.MAILCHIMP_SERVER_PREFIX
  if (!apiKey || !listId || !serverPrefix) return null
  return { apiKey, listId, serverPrefix }
}

import crypto from 'crypto'

/** MD5 hash of lowercase email for Mailchimp subscriber hash */
function subscriberHash(email: string): string {
  return crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex')
}

export interface SyncContactParams {
  email: string
  firstName?: string | null
  lastName?: string | null
}

/**
 * Add or update a list member (subscribe). No-op if Mailchimp not configured (integration or env).
 */
export async function syncContact(params: SyncContactParams): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getMailchimpConfig()
  if (!cfg) {
    return { ok: true }
  }

  const { email, firstName, lastName } = params
  const hash = subscriberHash(email)
  const url = `https://${cfg.serverPrefix}.api.mailchimp.com/3.0/lists/${cfg.listId}/members/${hash}`

  const body: Record<string, unknown> = {
    email_address: email.toLowerCase().trim(),
    status: 'subscribed',
    merge_fields: {},
  }
  if (firstName != null && firstName !== '') {
    (body.merge_fields as Record<string, string>).FNAME = firstName
  }
  if (lastName != null && lastName !== '') {
    (body.merge_fields as Record<string, string>).LNAME = lastName
  }

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const message = (json as { detail?: string }).detail || res.statusText
      console.error('Mailchimp sync error:', res.status, message)
      return { ok: false, error: message }
    }
    return { ok: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Mailchimp sync error:', message)
    return { ok: false, error: message }
  }
}
