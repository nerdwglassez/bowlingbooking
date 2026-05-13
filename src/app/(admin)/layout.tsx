// Admin route group layout.
//
// Theme: ALWAYS dark. Resolved server-side via the root layout reading
// `x-pathname` (set by proxy.ts) — see src/lib/theme.ts.
//
// Auth: MANAGER or ADMIN required. STAFF role is intentionally excluded;
// admin surfaces include settings, integrations, and refund logs.

import { requireRole } from '@/lib/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('MANAGER', 'ADMIN')
  return <>{children}</>
}
