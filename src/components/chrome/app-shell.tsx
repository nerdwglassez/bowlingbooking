// AppShell — shared frame for the staff app (all employee roles).
//
// Server-safe. Lives in chrome/ (not patterns/) because it owns viewport
// positioning via <NavRail>. The drift sentinel allows `fixed`/`sticky`
// classes here.
//
// Layouts pass:
//   - user.role for role-filtered nav (active path via usePathname in NavRail)
//   - user + tenant for the brand + footer
//
// The shell never imports auth helpers — gating happens upstream in the
// route-group layout.

import { Button } from '@/components/ui/button'
import { NavRail } from '@/components/chrome/nav-rail'
import { SettingsSectionProviders } from '@/components/chrome/settings-section-providers'
import { signOutAction } from '@/app/signin/actions'
import { formatStaffRole } from '@/lib/staff-nav'
import type { Role } from '@/types'

export interface AppShellProps {
  user: { email: string | null; name?: string | null; role: Role }
  tenant: { name: string }
  children: React.ReactNode
}

export function AppShell({
  user,
  tenant,
  children,
}: AppShellProps) {
  const roleLabel = formatStaffRole(user.role)

  const brand = (
    <div className="flex flex-col gap-1">
      <span className="[font-family:var(--font-display)] text-base text-[var(--color-text-primary)]">
        {tenant.name}
      </span>
      <StaffRoleBadge label={roleLabel} />
    </div>
  )

  const footer = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5 px-2 text-xs">
        <span className="text-[var(--color-text-primary)]">
          {user.name ?? user.email ?? 'Signed in'}
        </span>
        <StaffRoleBadge label={roleLabel} compact />
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="sm" fullWidth>
          Sign out
        </Button>
      </form>
    </div>
  )

  return (
    <SettingsSectionProviders>
      <div className="min-h-dvh bg-[var(--surface-ground)] pb-16 md:pb-0 md:pl-64">
        <NavRail
          role={user.role}
          brand={brand}
          footer={footer}
        />
        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:py-8">
          {children}
        </main>
      </div>
    </SettingsSectionProviders>
  )
}

function StaffRoleBadge({
  label,
  compact = false,
}: {
  label: string
  compact?: boolean
}) {
  return (
    <span
      className={
        compact
          ? 'text-[var(--color-text-secondary)]'
          : 'inline-flex w-fit rounded-[var(--radius-full)] border border-solid border-[var(--color-border-strong)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]'
      }
    >
      {label}
    </span>
  )
}
