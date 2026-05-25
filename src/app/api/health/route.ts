import { NextResponse } from 'next/server'

import { isDevWithoutDb } from '@/lib/env'
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

  try {
    const tenant = await getTenant()
    return NextResponse.json({
      ok: true,
      tenantSlug: tenant.slug,
      tenantId: tenant.id,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Tenant resolution failed'
    return NextResponse.json({ ok: false, error: message }, { status: 503 })
  }
}
