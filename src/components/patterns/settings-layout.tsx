'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { SettingsSignOutItem } from '@/components/chrome/settings-sign-out-item'
import type { SettingsGroup } from '@/lib/staff-nav'

export function SettingsLayout({
  groups,
  venueName,
  children,
}: {
  groups: SettingsGroup[]
  venueName: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isHub = pathname === '/staff/settings'

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <aside
        className={`shrink-0 md:w-[220px] ${isHub ? 'hidden md:block' : 'hidden md:block'}`}
      >
        <nav className="flex flex-col gap-4">
          <Link
            href="/staff/settings"
            className="px-1 text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-action)]"
          >
            Settings
          </Link>
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <h2 className="px-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                {group.label}
              </h2>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  if (item.action === 'sign-out') {
                    if (isHub) return null
                    return (
                      <li key={item.label}>
                        <SettingsSignOutItem venueName={venueName} />
                      </li>
                    )
                  }
                  if (!item.href) return null
                  const active =
                    pathname === item.href ||
                    (item.href !== '/staff/settings' &&
                      pathname.startsWith(item.href))
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className={`block rounded-[var(--radius-md)] border border-solid px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'border-transparent border-l-[3px] border-l-[var(--color-action)] bg-[color-mix(in_srgb,var(--color-action)_8%,transparent)] pl-[calc(0.75rem-2px)] text-[var(--color-action)]'
                            : 'border-transparent text-[var(--color-text-primary)] hover:border-[var(--color-border)] hover:bg-[var(--surface-sunken)]'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 md:max-w-[640px]">{children}</div>
    </div>
  )
}
