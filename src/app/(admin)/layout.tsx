// Admin route group layout.
//
// Theme: ALWAYS dark. Resolved server-side via the root layout reading
// `x-pathname` (set by proxy.ts) — see src/lib/theme.ts.
//
// Auth: MANAGER or ADMIN required. STAFF is intentionally excluded; admin
// surfaces include settings (venue, packages, team) and refund logs.
//
// Layout: wraps every admin page in <AppShell> with the admin nav items.
// A "← Staff" secondary footer link lets managers jump back to the cockpit
// without re-navigating from the home page.

export const dynamic = 'force-dynamic'

import { headers } from 'next/headers'
import Link from 'next/link'
import { BarChart3, Building2, ScrollText, Settings, Tag, Ticket, Users } from 'lucide-react'

import { AppShell } from '@/components/chrome/app-shell'
import { Button } from '@/components/ui/button'
import { requireRole } from '@/lib/auth'
import { getTenant } from '@/lib/tenant'

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: Settings },
  { href: '/admin/venue', label: 'Venue', icon: Building2 },
  { href: '/admin/packages', label: 'Packages', icon: Tag },
  { href: '/admin/promos', label: 'Promos', icon: Ticket },
  { href: '/admin/team', label: 'Team', icon: Users },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
] as const

const ADMIN_ONLY_HREFS = new Set<string>(['/admin/reports', '/admin/audit'])

function adminNavForRole(role: string) {
  if (role === 'ADMIN') return [...ADMIN_NAV]
  return ADMIN_NAV.filter((item) => !ADMIN_ONLY_HREFS.has(item.href))
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('MANAGER', 'ADMIN')
  const tenant = await getTenant()
  const h = await headers()
  const currentPath = h.get('x-pathname') ?? '/admin'

  return (
    <AppShell
      currentPath={currentPath}
      user={{ email: user.email, name: user.name, role: user.role }}
      tenant={{ name: tenant.name }}
      navItems={adminNavForRole(user.role)}
      eyebrowLabel="Admin"
      secondaryFooter={
        <Button asChild variant="ghost" size="sm" fullWidth>
          <Link href="/staff">← Staff cockpit</Link>
        </Button>
      }
    >
      {children}
    </AppShell>
  )
}
