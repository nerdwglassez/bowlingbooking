// AppShell — shared frame for the staff app (all employee roles).
//
// Server-safe. Lives in chrome/ (not patterns/) because it owns viewport
// positioning via <NavRail>. The drift sentinel allows `fixed`/`sticky`
// classes here.
//
// Layouts pass user.role for role-filtered nav and user + tenant for the
// Untitled sidebar brand + account card. Gating happens in the route-group
// layout — the shell never imports auth helpers.

import { Suspense } from 'react'

import { NavRail } from '@/components/chrome/nav-rail'
import { SettingsSectionProviders } from '@/components/chrome/settings-section-providers'
import type { Role } from '@/types'

export interface AppShellProps {
  user: { email: string | null; name?: string | null; role: Role }
  tenant: { name: string }
  children: React.ReactNode
}

export function AppShell({ user, tenant, children }: AppShellProps) {
  const brand = (
    <span className="block truncate text-lg font-semibold text-primary [font-family:var(--font-display)]">
      {tenant.name}
    </span>
  )

  return (
    <SettingsSectionProviders>
      <div className="min-h-dvh bg-primary">
        <Suspense
          fallback={
            <>
              <header className="h-16 border-b border-secondary bg-primary lg:hidden" />
              <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-[280px] lg:border-r lg:border-secondary lg:bg-primary" />
            </>
          }
        >
          <NavRail
            role={user.role}
            brand={brand}
            user={{ email: user.email, name: user.name, role: user.role }}
            venueName={tenant.name}
          />
        </Suspense>
        <main className="lg:ml-[280px]">
          <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </SettingsSectionProviders>
  )
}
