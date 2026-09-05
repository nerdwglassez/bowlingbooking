// (staff)/layout.tsx — staff route group layout.
//
// Theme: StaffThemeScope syncs data-theme to the device color scheme.
//
// Auth: STAFF or higher required. `requireRole` redirects unauthenticated
// users to `/signin?from=…`; CUSTOMER role hits `unauthorized()`. The
// drift sentinel fails verify if this call is missing.
//
// Layout: wraps every staff page in <AppShell> with unified role-filtered nav.

export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/chrome/app-shell'
import { StaffObservabilityScope } from '@/components/chrome/staff-observability-scope'
import { StaffThemeScope } from '@/components/chrome/staff-theme-scope'
import { StaffToastProvider } from '@/components/chrome/staff-toast-provider'
import { requireRole } from '@/lib/auth'
import { setObservabilitySurface } from '@/lib/observability'
import { getTenant } from '@/lib/tenant'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  setObservabilitySurface('staff')
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const tenant = await getTenant()

  return (
    <StaffThemeScope>
      <StaffObservabilityScope>
        <StaffToastProvider>
          <AppShell
            user={{ email: user.email, name: user.name, role: user.role }}
            tenant={{ name: tenant.name }}
          >
            {children}
          </AppShell>
        </StaffToastProvider>
      </StaffObservabilityScope>
    </StaffThemeScope>
  )
}
