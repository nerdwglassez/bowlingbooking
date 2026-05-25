import { redirect } from 'next/navigation'

import type { HomeEntry } from '@/lib/env.home-entry'
import { getHomeRedirectPath } from '@/lib/env.home-entry'

/**
 * Quick dev toggle: set to `'staff'` or `'admin'` to override env; keep `null`
 * to use `NEXT_PUBLIC_HOME_ENTRY` (defaults to customer booking).
 */
const PAGE_HOME_ENTRY: HomeEntry | null = null

/** Avoid serving a statically cached Phase 1 placeholder at `/` on Vercel. */
export const dynamic = 'force-dynamic'

export default function Home() {
  redirect(getHomeRedirectPath(PAGE_HOME_ENTRY))
}
