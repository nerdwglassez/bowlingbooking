/**
 * Tenant resolution for the current deployment.
 *
 * - Pages MUST read venue name, address, phone, and theme via `getTenant()` — never hardcode.
 * - Future multi-tenant routing (subdomain or path param) only rewrites this module; callers stay unchanged.
 *
 * Dev fallback: if `DATABASE_URL` is missing in a non-production environment,
 * `getTenant()` returns a hard-coded "Royal Z Lanes" stub so the booking flow
 * still renders for design work and storybook-style exploration. Production
 * always requires a real DB row (the fallback only kicks in when `NODE_ENV`
 * is not `production`).
 */

import { cache } from 'react'

import { isDevWithoutDb, warnOnce } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import type { Tenant } from '@/types'

const FALLBACK_SLUG = 'royalz'

function resolveTenantSlug(): string {
  const fromEnv = process.env.DEFAULT_TENANT_SLUG?.trim()
  if (fromEnv) return fromEnv
  warnOnce(
    'tenant-slug',
    'DEFAULT_TENANT_SLUG is not set — falling back to "royalz". Set DEFAULT_TENANT_SLUG in production.',
  )
  return FALLBACK_SLUG
}

function mockTenant(slug: string): Tenant {
  return {
    id: `mock-${slug}`,
    name: 'Royal Z Lanes',
    slug,
    address: '123 Bowling Lane, Anytown, USA',
    phone: '(555) 555-0123',
    timezone: 'America/New_York',
    themeSlug: 'default',
    holdTimeoutMins: 10,
    maxOnlineBowlers: 18,
    config: {},
  }
}

function mapTenant(row: {
  id: string
  name: string
  slug: string
  address: string
  phone: string
  timezone: string
  themeSlug: string
  holdTimeoutMins: number
  maxOnlineBowlers: number
  config: unknown
}): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    phone: row.phone,
    timezone: row.timezone,
    themeSlug: row.themeSlug,
    holdTimeoutMins: row.holdTimeoutMins,
    maxOnlineBowlers: row.maxOnlineBowlers,
    config:
      row.config && typeof row.config === 'object' && !Array.isArray(row.config)
        ? (row.config as Record<string, unknown>)
        : {},
  }
}

export const getTenant = cache(async function getTenant(): Promise<Tenant> {
  const slug = resolveTenantSlug()

  if (isDevWithoutDb()) {
    warnOnce(
      'tenant-db',
      `DATABASE_URL not set — returning mock tenant "${slug}" for dev. ` +
        `Run \`npx prisma migrate dev\` and seed the database for real data.`,
    )
    return mockTenant(slug)
  }

  const row = await prisma.tenant.findUnique({ where: { slug } })
  if (!row) {
    throw new Error(
      `Tenant not found for slug "${slug}". Check DEFAULT_TENANT_SLUG and database seed/migrations.`,
    )
  }
  return mapTenant(row)
})
