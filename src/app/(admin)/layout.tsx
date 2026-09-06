// (admin)/layout.tsx — admin route group layout.
//
// Theme: StaffThemeScope + theme cookie follow the device color scheme.
// See src/lib/theme.ts.
//
// Auth: MANAGER or ADMIN required for settings sub-pages under /admin/*.
// Uses the same AppShell and nav as the staff route group — one app, two
// auth gates.
//
// Layout: wraps every admin page in <AppShell> with unified role-filtered nav.

export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'

import { AppShell } from '@/components/chrome/app-shell'
import { StaffObservabilityScope } from '@/components/chrome/staff-observability-scope'
import { StaffThemeScope } from '@/components/chrome/staff-theme-scope'
import { requireRole } from '@/lib/auth'
import { setObservabilitySurface } from '@/lib/observability'
import { staffPwaMetadata, staffPwaViewport } from '@/lib/pwa-manifest'
import { getTenant } from '@/lib/tenant'

/** Same staff PWA meta as `(staff)` so Add to Home Screen from /admin is standalone. */
export async function generateMetadata(): Promise<Metadata> {
  return staffPwaMetadata(await getTenant())
}

export const viewport: Viewport = staffPwaViewport

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  setObservabilitySurface('staff')
  const user = await requireRole('MANAGER', 'ADMIN')
  const tenant = await getTenant()

  return (
    <StaffThemeScope>
      <StaffObservabilityScope>
        <AppShell
          user={{ email: user.email, name: user.name, role: user.role }}
          tenant={{ name: tenant.name }}
        >
          {children}
        </AppShell>
      </StaffObservabilityScope>
    </StaffThemeScope>
  )
}
