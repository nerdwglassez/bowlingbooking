import { NextResponse } from 'next/server'

import {
  getAuthUrlHost,
  hasAuthSecret,
  hasDatabaseUrl,
  isDevWithoutDb,
  resolveAuthUrlForChecks,
} from '@/lib/env'
import { getTenant } from '@/lib/tenant'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Deployment smoke check — hit `/api/health` after setting Vercel env vars.
 * Returns 503 with a short message when the DB or tenant row is misconfigured.
 */
export async function GET() {
  if (isDevWithoutDb()) {
    return NextResponse.json({
      ok: true,
      mode: 'mock',
      message: 'DATABASE_URL unset — dev mock tenant only',
    })
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'DATABASE_URL is not set on this deployment.',
        fix: 'Vercel → Project → Settings → Environment Variables: add DATABASE_URL (same Neon URL as .env.local), enable Production and Preview, then Redeploy.',
      },
      { status: 503 },
    )
  }

  try {
    const tenant = await getTenant()
    const authUrlHost = getAuthUrlHost()
    const warnings: string[] = []
    if (!hasAuthSecret()) {
      warnings.push('Set AUTH_SECRET on this deployment.')
    }
    if (authUrlHost === 'localhost' || authUrlHost?.startsWith('127.')) {
      warnings.push(
        'AUTH_URL points at localhost — set AUTH_URL to your Vercel domain or rely on VERCEL_URL inference after redeploy.',
      )
    }

    return NextResponse.json({
      ok: true,
      tenantSlug: tenant.slug,
      tenantId: tenant.id,
      authSecretConfigured: hasAuthSecret(),
      authUrlHost,
      authUrlResolved: resolveAuthUrlForChecks() ?? null,
      warnings: warnings.length ? warnings : undefined,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Tenant resolution failed'
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
