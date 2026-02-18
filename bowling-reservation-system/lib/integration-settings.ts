/**
 * Integration credentials and config stored in Settings table.
 * Server-side only. Use getIntegrationConfig for runtime (DB overrides env).
 * Use getIntegrationConfigMasked for API responses (secrets masked).
 */

import { prisma } from './db'

const PREFIX = 'integration_'

export type IntegrationId = 'stripe' | 'resend' | 'twilio' | 'mailchimp' | 'slack' | 'google-analytics' | 'pos-export'

export interface StripeConfig {
  publishableKey?: string
  secretKey?: string
  webhookSecret?: string
}

export interface ResendConfig {
  apiKey?: string
  from?: string
}

export interface TwilioConfig {
  accountSid?: string
  authToken?: string
  phoneNumber?: string
}

export interface MailchimpConfig {
  apiKey?: string
  listId?: string
  serverPrefix?: string
}

export interface SlackConfig {
  webhookUrl?: string
}

export interface GoogleAnalyticsConfig {
  measurementId?: string
}

export interface PosExportConfig {
  exportPath?: string
  format?: string
}

export type IntegrationConfigMap = {
  stripe: StripeConfig
  resend: ResendConfig
  twilio: TwilioConfig
  mailchimp: MailchimpConfig
  slack: SlackConfig
  'google-analytics': GoogleAnalyticsConfig
  'pos-export': PosExportConfig
}

const SECRET_KEYS: Record<string, string[]> = {
  stripe: ['secretKey', 'webhookSecret'],
  resend: ['apiKey'],
  twilio: ['authToken'],
  mailchimp: ['apiKey'],
  slack: ['webhookUrl'],
  'google-analytics': [],
  'pos-export': [],
}

function maskValue(value: string): string {
  if (!value || value.length <= 4) return '••••••'
  return value.slice(0, 4) + '••••••••••••' + value.slice(-4)
}

function maskConfig<T extends Record<string, unknown>>(
  integrationId: string,
  config: T
): T {
  const secretKeys = SECRET_KEYS[integrationId]
  if (!secretKeys?.length) return config
  const out = { ...config }
  for (const key of secretKeys) {
    if (out[key] && typeof out[key] === 'string') {
      ;(out as Record<string, string>)[key] = maskValue(out[key] as string)
    }
  }
  return out
}

async function getRaw(integrationId: string): Promise<string | null> {
  const row = await prisma.settings.findUnique({
    where: { key: PREFIX + integrationId },
  })
  return row?.value ?? null
}

/**
 * Get integration config for server-side use (e.g. sending email).
 * DB value overrides env when present.
 */
export async function getIntegrationConfig<K extends IntegrationId>(
  integrationId: K
): Promise<IntegrationConfigMap[K] | null> {
  const raw = await getRaw(integrationId)
  let fromDb: IntegrationConfigMap[K] | null = null
  if (raw) {
    try {
      fromDb = JSON.parse(raw) as IntegrationConfigMap[K]
    } catch {
      return null
    }
  }

  // Merge with env fallbacks
  if (integrationId === 'stripe') {
    const c = (fromDb ?? {}) as StripeConfig
    return {
      publishableKey: c.publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || undefined,
      secretKey: c.secretKey || process.env.STRIPE_SECRET_KEY || undefined,
      webhookSecret: c.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || undefined,
    } as IntegrationConfigMap[K]
  }
  if (integrationId === 'resend') {
    const c = (fromDb ?? {}) as ResendConfig
    return {
      apiKey: c.apiKey || process.env.RESEND_API_KEY || undefined,
      from: c.from || process.env.EMAIL_FROM || undefined,
    } as IntegrationConfigMap[K]
  }
  if (integrationId === 'twilio') {
    const c = (fromDb ?? {}) as TwilioConfig
    return {
      accountSid: c.accountSid || process.env.TWILIO_ACCOUNT_SID || undefined,
      authToken: c.authToken || process.env.TWILIO_AUTH_TOKEN || undefined,
      phoneNumber: c.phoneNumber || process.env.TWILIO_PHONE_NUMBER || undefined,
    } as IntegrationConfigMap[K]
  }
  if (integrationId === 'mailchimp') {
    const c = (fromDb ?? {}) as MailchimpConfig
    return {
      apiKey: c.apiKey || process.env.MAILCHIMP_API_KEY || undefined,
      listId: c.listId || process.env.MAILCHIMP_LIST_ID || undefined,
      serverPrefix: c.serverPrefix || process.env.MAILCHIMP_SERVER_PREFIX || undefined,
    } as IntegrationConfigMap[K]
  }
  return fromDb
}

/**
 * Get config with secrets masked for API response.
 */
export async function getIntegrationConfigMasked<K extends IntegrationId>(
  integrationId: K
): Promise<IntegrationConfigMap[K] | null> {
  const config = await getIntegrationConfig(integrationId)
  if (!config) return null
  return maskConfig(integrationId, config as Record<string, unknown>) as IntegrationConfigMap[K]
}

/**
 * Save integration config (from UI). Only stored in DB; env is not modified.
 * Empty strings are ignored so existing values are not cleared.
 */
export async function setIntegrationConfig<K extends IntegrationId>(
  integrationId: K,
  config: Partial<IntegrationConfigMap[K]>
): Promise<void> {
  const key = PREFIX + integrationId
  const existing = await getIntegrationConfig(integrationId)
  const updates: Record<string, unknown> = { ...(existing ?? {}) as Record<string, unknown> }
  for (const [k, v] of Object.entries(config)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      updates[k] = v
    }
  }
  const value = JSON.stringify(updates as IntegrationConfigMap[K])
  await prisma.settings.upsert({
    where: { key },
    update: { value },
    create: {
      key,
      value,
      description: `Integration config: ${integrationId}`,
    },
  })
}

/**
 * Derive status: connected if required fields are present (from DB or env).
 */
export function getIntegrationStatus(
  integrationId: IntegrationId,
  config: IntegrationConfigMap[IntegrationId] | null
): 'connected' | 'not_connected' | 'configured_in_env' {
  if (!config) return 'not_connected'
  switch (integrationId) {
    case 'stripe':
      return (config as StripeConfig).secretKey ? 'connected' : 'not_connected'
    case 'resend':
      return (config as ResendConfig).apiKey ? 'connected' : 'not_connected'
    case 'twilio': {
      const t = config as TwilioConfig
      return t.accountSid && t.authToken && t.phoneNumber ? 'connected' : 'not_connected'
    }
    case 'mailchimp': {
      const m = config as MailchimpConfig
      return m.apiKey && m.listId && m.serverPrefix ? 'connected' : 'not_connected'
    }
    case 'slack':
      return (config as SlackConfig).webhookUrl ? 'connected' : 'not_connected'
    case 'google-analytics':
      return (config as GoogleAnalyticsConfig).measurementId ? 'connected' : 'not_connected'
    case 'pos-export':
      return (config as PosExportConfig).exportPath ? 'connected' : 'not_connected'
    default:
      return 'not_connected'
  }
}
