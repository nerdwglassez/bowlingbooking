/**
 * Tenant-scoped integration preferences stored under Tenant.config.integrations.
 * Connection for Stripe is primarily stripeConnectAccountId; Resend/Make use
 * these prefs once platform credentials exist.
 */

export type IntegrationId = 'stripe' | 'resend' | 'make'

export type IntegrationPreference = {
  /** Soft-connected for Resend/Make (platform credentials still required). */
  connected?: boolean
  /** When false, keep credentials but pause use of the integration. */
  enabled?: boolean
  connectedAt?: string
}

export type IntegrationsConfig = Partial<
  Record<IntegrationId, IntegrationPreference>
>

export function readIntegrationsConfig(config: unknown): IntegrationsConfig {
  const root =
    config && typeof config === 'object' && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {}
  const raw = root.integrations
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: IntegrationsConfig = {}
  for (const id of ['stripe', 'resend', 'make'] as const) {
    const entry = (raw as Record<string, unknown>)[id]
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const row = entry as Record<string, unknown>
    out[id] = {
      connected: typeof row.connected === 'boolean' ? row.connected : undefined,
      enabled: typeof row.enabled === 'boolean' ? row.enabled : undefined,
      connectedAt:
        typeof row.connectedAt === 'string' ? row.connectedAt : undefined,
    }
  }
  return out
}

export function mergeIntegrationsConfig(
  config: unknown,
  patch: IntegrationsConfig,
): Record<string, unknown> {
  const root =
    config && typeof config === 'object' && !Array.isArray(config)
      ? { ...(config as Record<string, unknown>) }
      : {}
  const current = readIntegrationsConfig(root)
  const next: IntegrationsConfig = { ...current }
  for (const id of Object.keys(patch) as IntegrationId[]) {
    const incoming = patch[id]
    if (!incoming) continue
    next[id] = { ...current[id], ...incoming }
  }
  root.integrations = next
  return root
}

export function removeIntegrationFromConfig(
  config: unknown,
  id: IntegrationId,
): Record<string, unknown> {
  const root =
    config && typeof config === 'object' && !Array.isArray(config)
      ? { ...(config as Record<string, unknown>) }
      : {}
  const current = { ...readIntegrationsConfig(root) }
  delete current[id]
  root.integrations = current
  return root
}

export function isIntegrationEnabled(
  prefs: IntegrationPreference | undefined,
  connected: boolean,
): boolean {
  if (!connected) return false
  return prefs?.enabled !== false
}
