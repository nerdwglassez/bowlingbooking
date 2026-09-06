import { describe, expect, it } from 'vitest'

import {
  buildCustomerManifest,
  buildStaffManifest,
  shortTenantName,
} from '@/lib/pwa-manifest'
import type { Tenant } from '@/types'

const TENANT = {
  id: 't1',
  name: 'Kingpin Bowling',
  slug: 'kingpin',
  address: '1 Main St',
  phone: '555-0100',
  timezone: 'America/New_York',
  themeSlug: 'default',
  holdTimeoutMins: 10,
  maxOnlineBowlers: 18,
  cancellationWindowHours: 24,
  rescheduleWindowHours: 24,
  checkInWindowMinutes: 60,
  bowlersPerLane: 6,
  cancellationRefundPercent: 100,
  config: {},
} satisfies Tenant

describe('pwa-manifest', () => {
  it('shortens long venue names for home-screen labels', () => {
    expect(shortTenantName('Kingpin Bowling', 10)).toBe('Kingpin B…')
    expect(shortTenantName('Short', 10)).toBe('Short')
  })

  it('builds a standalone staff manifest from the tenant name', () => {
    const m = buildStaffManifest(TENANT)
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/staff')
    expect(m.scope).toBe('/')
    expect(m.orientation).toBe('any')
    expect(m.name).toBe('Kingpin Bowling — Staff')
    expect(m.short_name).toContain('Staff')
    expect(m.name).not.toMatch(/Royal/i)
  })

  it('builds a portrait customer manifest from the tenant name', () => {
    const m = buildCustomerManifest(TENANT)
    expect(m.display).toBe('standalone')
    expect(m.start_url).toBe('/')
    expect(m.orientation).toBe('portrait')
    expect(m.name).toBe('Kingpin Bowling')
    expect(m.name).not.toMatch(/Royal/i)
  })
})
