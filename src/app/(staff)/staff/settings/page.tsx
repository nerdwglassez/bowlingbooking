// /staff/settings — settings hub (tab 4 in the unified staff app).
//
// Role-filtered grouped list. Sub-pages live under /admin/* (MANAGER+) or
// /staff/settings/* (STAFF view-only) per staff/06_SETTINGS.md.

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { requireRole } from '@/lib/auth'
import { getSettingsGroups } from '@/lib/staff-nav'

export default async function StaffSettingsPage() {
  const user = await requireRole('STAFF', 'MANAGER', 'ADMIN')
  const groups = getSettingsGroups(user.role)
  const isStaffOnly = user.role === 'STAFF'

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl">Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Venue configuration, booking rules, and account.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.label} className="flex flex-col gap-2">
            <h2 className="px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {group.label}
            </h2>
            <ul className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li key={`${group.label}-${item.label}`}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] px-3.5 py-3 transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--surface-sunken)] ${item.viewOnly ? 'opacity-60' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                        {item.sub}
                      </p>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-[var(--color-text-secondary)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {isStaffOnly ? (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Need more access? Contact your venue admin.
        </p>
      ) : null}
    </>
  )
}
