// NavRail — primary navigation for the staff/admin shells.
//
// Renders as a fixed left sidebar on `md` and up; as a bottom tab bar on
// smaller viewports. Pure layout/CSS — no JS, no useState. Active highlight
// is computed from the `currentPath` prop, passed in by the layout.
//
// Items are passed in by the consuming layout (one source of truth for
// what's in the nav). `icon` is a Lucide component reference so the pattern
// stays icon-agnostic.

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export interface NavRailItem {
  href: string
  label: string
  icon: LucideIcon
  /** Optional small number/dot rendered next to the label. */
  badge?: number | null
}

export interface NavRailProps {
  items: NavRailItem[]
  currentPath: string
  /** Brand label rendered at the top of the sidebar. */
  brand?: React.ReactNode
  /** Slot rendered at the bottom of the sidebar (e.g. user card + sign out). */
  footer?: React.ReactNode
}

function isActive(itemHref: string, currentPath: string): boolean {
  if (itemHref === currentPath) return true
  return currentPath.startsWith(itemHref + '/')
}

export function NavRail({ items, currentPath, brand, footer }: NavRailProps) {
  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] md:flex"
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
                active={isActive(item.href, currentPath)}
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
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-solid border-[var(--color-border)] bg-[var(--surface-elevated)] md:hidden"
      >
        {items.map((item) => (
          <NavRailTabLink
            key={item.href}
            item={item}
            active={isActive(item.href, currentPath)}
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
      className="group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--color-text-primary)] data-[active]:bg-[var(--surface-sunken)] data-[active]:text-[var(--color-text-primary)]"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
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
      className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-[var(--color-text-secondary)] data-[active]:text-[var(--color-text-primary)]"
    >
      <Icon className="size-5" aria-hidden />
      <span>{item.label}</span>
    </Link>
  )
}
