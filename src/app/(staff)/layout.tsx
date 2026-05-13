// Staff route group layout.
//
// Theme: ALWAYS dark. The root layout resolves the theme server-side from
// the request path (see src/lib/theme.ts). /staff/* matches the
// forced-dark pattern there — no client script, no flash, no warning.
//
// Auth: STAFF or higher required. `requireRole` redirects unauthenticated
// users to `/signin?from=…`; CUSTOMER role hits `unauthorized()`. The
// drift sentinel fails verify if this call is missing.
//
// Layout: wraps every staff page in <AppShell> with the staff nav items.

import { headers } from 'next/headers'
import { Calendar, ClipboardList, Plus } from 'lucide-react'

import { AppShell } from '@/components/chrome/app-shell'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

const STAFF_NAV = [
  { href: '/staff', label: 'Cockpit', icon: ClipboardList },
  { href: '/staff/schedule', label: 'Schedule', icon: Calendar },
  { href: '/staff/walkin', label: 'Walk-in', icon: Plus },
]

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const h = await headers()
  const currentPath = h.get('x-pathname') ?? '/staff'

  return (
    <AppShell
      currentPath={currentPath}
      user={{ email: user.email, name: user.name, role: user.role }}
      tenant={{ name: tenant.name }}
      navItems={STAFF_NAV}
      eyebrowLabel="Staff"
    >
      {children}
    </AppShell>
  )
}
