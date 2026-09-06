import { NextResponse } from 'next/server'

import { buildStaffManifest } from '@/lib/pwa-manifest'
import { getTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

/** Dynamic staff PWA manifest — venue name from tenant, never hardcoded. */
export async function GET() {
  const tenant = await getTenant()
  const manifest = buildStaffManifest(tenant)
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
