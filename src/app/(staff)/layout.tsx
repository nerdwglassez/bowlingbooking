// Staff route group layout.
//
// Theme: ALWAYS dark. The root layout resolves the theme server-side from
// the request path (see src/lib/theme.ts). Because /staff/* matches the
// forced-dark pattern there, `<html data-theme="dark">` is rendered during
// SSR — no client script, no flash, no hydration warning.
//
// Auth: STAFF or higher required. `requireRole` redirects unauthenticated
// users to `/signin?from=…`; CUSTOMER role hits `unauthorized()`.

import { requireRole } from '@/lib/auth'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('STAFF', 'MANAGER', 'ADMIN')
  return <>{children}</>
}
