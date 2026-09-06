import { describe, expect, it } from 'vitest'

import {
  isIntegrationEnabled,
  mergeIntegrationsConfig,
  readIntegrationsConfig,
  removeIntegrationFromConfig,
} from '@/lib/integrations'

describe('integrations config helpers', () => {
  it('reads empty config as empty prefs', () => {
    expect(readIntegrationsConfig({})).toEqual({})
    expect(readIntegrationsConfig(null)).toEqual({})
  })

  it('merges integration prefs without wiping siblings', () => {
    const next = mergeIntegrationsConfig(
      { integrations: { resend: { connected: true, enabled: true } } },
      { make: { connected: true, enabled: false } },
    )
    expect(next.integrations).toEqual({
      resend: { connected: true, enabled: true },
      make: { connected: true, enabled: false },
    })
  })

  it('removes one integration key', () => {
    const next = removeIntegrationFromConfig(
      {
        integrations: {
          stripe: { enabled: true },
          resend: { connected: true },
        },
      },
      'stripe',
    )
    expect(next.integrations).toEqual({
      resend: { connected: true },
    })
  })

  it('treats missing enabled as on when connected', () => {
    expect(isIntegrationEnabled(undefined, true)).toBe(true)
    expect(isIntegrationEnabled({ enabled: false }, true)).toBe(false)
    expect(isIntegrationEnabled({ enabled: true }, false)).toBe(false)
  })
})
