'use client'

// NavRail — primary navigation for the staff/admin shells.
//
// Active highlight uses `usePathname()` so client-side navigations update
// immediately. (Server `x-pathname` in layouts can lag behind soft nav.)

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

import { getStaffNavItems } from '@/lib/staff-nav'
import type { Role } from '@/types'

export interface NavRailItem {
  href: string
  label: string
  icon: LucideIcon
  /** Optional small number/dot rendered next to the label. */
  badge?: number | null
  /** Custom active matcher; defaults to href prefix matching. */
  isActive?: (currentPath: string) => boolean
}

export interface NavRailProps {
  role: Role
  /** Brand label rendered at the top of the sidebar. */
  brand?: React.ReactNode
  /** Slot rendered at the bottom of the sidebar (e.g. user card + sign out). */
  footer?: React.ReactNode
}

export function isNavItemActive(item: NavRailItem, currentPath: string): boolean {
  if (item.isActive) return item.isActive(currentPath)
  if (item.href === currentPath) return true
  return currentPath.startsWith(item.href + '/')
}

export function NavRail({ role, brand, footer }: NavRailProps) {
  const pathname = usePathname()
  const items = getStaffNavItems(role)

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-solid border-[var(--color-border)] bg-[var(--surface-card)] md:flex"
      >
        {brand ? (
          <div className="border-b border-solid border-[var(--color-border)] px-5 py-4">
            {brand}
          </div>
        ) : null}
        <ul className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => (
            <li key={item.href}>
              <NavRailItemLink
                item={item}
                active={isNavItemActive(item, pathname)}
              />
            </li>
          ))}
        </ul>
        {footer ? (
          <div className="border-t border-solid border-[var(--color-border)] p-3">
            {footer}
          </div>
        ) : null}
      </nav>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-solid border-[var(--color-border)] bg-[var(--surface-card)] md:hidden"
      >
        {items.map((item) => (
          <NavRailTabLink
            key={item.href}
            item={item}
            active={isNavItemActive(item, pathname)}
          />
        ))}
      </nav>
    </>
  )
}

function NavRailItemLink({
  item,
  active,
}: {
  item: NavRailItem
  active: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      data-active={active ? '' : undefined}
      className="group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--color-text-primary)] data-[active]:border-l-2 data-[active]:border-[var(--color-action-dark)] data-[active]:bg-[var(--surface-sunken)] data-[active]:pl-[calc(0.75rem-2px)] data-[active]:text-[var(--color-action-dark)]"
    >
      <Icon
        className="size-4 shrink-0 opacity-35 group-data-[active]:opacity-100"
        aria-hidden
      />
      <span className="flex-1">{item.label}</span>
      {typeof item.badge === 'number' && item.badge > 0 ? (
        <span className="rounded-full bg-[var(--color-action)] px-2 text-[11px] font-semibold text-[var(--color-text-on-action)]">
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}

function NavRailTabLink({
  item,
  active,
}: {
  item: NavRailItem
  active: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      data-active={active ? '' : undefined}
      className="relative flex flex-1 flex-col items-center gap-1 py-3 text-xs text-[var(--color-text-muted)] data-[active]:text-[var(--color-action-dark)]"
    >
      {active ? (
        <span
          className="absolute inset-x-0 top-0 mx-auto h-0.5 w-5 rounded-full bg-[var(--color-action-dark)]"
          aria-hidden
        />
      ) : null}
      <Icon
        className={`size-5 ${active ? 'opacity-100' : 'opacity-35'}`}
        aria-hidden
      />
      <span>{item.label}</span>
    </Link>
  )
}
