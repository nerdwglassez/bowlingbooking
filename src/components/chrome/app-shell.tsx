// AppShell — shared frame for the staff and admin route groups.
//
// Server-safe. Lives in chrome/ (not patterns/) because it owns viewport
// positioning via <NavRail>. The drift sentinel allows `fixed`/`sticky`
// classes here.
//
// Layouts pass:
//   - currentPath (read from `x-pathname` header set by src/proxy.ts)
//   - navItems (which surface — staff/admin/etc.)
//   - user + tenant for the brand + footer
//   - eyebrowLabel ("Staff" / "Admin") for the brand block
//
// The shell never imports auth helpers — gating happens upstream in the
// route-group layout.

import { Button } from '@/components/ui/button'
import { NavRail, type NavRailItem } from '@/components/chrome/nav-rail'
import { signOutAction } from '@/app/signin/actions'

export interface AppShellProps {
  currentPath: string
  user: { email: string | null; name?: string | null; role: string }
  tenant: { name: string }
  navItems: NavRailItem[]
  /** Small label above the venue name in the sidebar (e.g. "Staff", "Admin"). */
  eyebrowLabel: string
  /** Optional secondary nav rendered above sign-out (e.g. "← Staff" link). */
  secondaryFooter?: React.ReactNode
  children: React.ReactNode
}

export function AppShell({
  currentPath,
  user,
  tenant,
  navItems,
  eyebrowLabel,
  secondaryFooter,
  children,
}: AppShellProps) {
  const brand = (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        {eyebrowLabel}
      </span>
      <span className="[font-family:var(--font-display)] text-base text-[var(--color-text-primary)]">
        {tenant.name}
      </span>
    </div>
  )

  const footer = (
    <div className="flex flex-col gap-2">
      {secondaryFooter}
      <div className="flex flex-col gap-0.5 px-2 text-xs">
        <span className="text-[var(--color-text-primary)]">
          {user.name ?? user.email ?? 'Signed in'}
        </span>
        <span className="text-[var(--color-text-secondary)]">{user.role}</span>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="sm" fullWidth>
          Sign out
        </Button>
      </form>
    </div>
  )

  return (
    <div className="min-h-dvh bg-[var(--surface-ground)] pb-16 md:pb-0 md:pl-64">
      <NavRail
        items={navItems}
        currentPath={currentPath}
        brand={brand}
        footer={footer}
      />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  )
}
