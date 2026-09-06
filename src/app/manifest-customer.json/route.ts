import { NextResponse } from 'next/server'

import { buildCustomerManifest } from '@/lib/pwa-manifest'
import { getTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/** Dynamic customer PWA manifest — venue name from tenant, never hardcoded. */
export async function GET() {
  const tenant = await getTenant()
  const manifest = buildCustomerManifest(tenant)
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
