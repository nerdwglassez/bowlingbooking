'use client'

// NavRail — Untitled-shaped staff sidebar (280px, hamburger < lg).
//
// Composes NavItemBase collapsible summaries with Next.js Link so client
// routing is preserved. Do not mount SidebarNavigationSimple wholesale
// (Untitled logo, ⌘K, dummy account). Accordion sections open one at a time.

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, type FC, type ReactNode, type SVGProps } from 'react'
import { ChevronDown } from '@untitledui/icons'

import { StaffMobileHeader } from '@/components/chrome/staff-mobile-header'
import { StaffNavAccountCard } from '@/components/chrome/staff-nav-account-card'
import { cx } from '@/lib/cx'
import {
  findOpenStaffNavSection,
  getStaffNavTree,
  staffNavLocation,
  type StaffNavItem,
  type StaffNavLeaf,
  type StaffNavNode,
} from '@/lib/staff-nav'
import type { Role } from '@/types'

export const STAFF_SIDEBAR_WIDTH_PX = 280

export type StaffNavIcon = FC<SVGProps<SVGSVGElement>>

export interface NavRailItem extends StaffNavItem {
  badge?: number | null
}

export interface NavRailProps {
  role: Role
  brand?: ReactNode
  user: { email: string | null; name?: string | null; role: Role }
  venueName: string
}

const NAV_ITEM_ROOT =
  'group/item relative flex max-h-9 w-full cursor-pointer items-center rounded-md bg-primary outline-focus-ring transition duration-100 ease-linear select-none hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2'
const NAV_ITEM_SELECTED = 'bg-secondary hover:bg-secondary_hover'

export function NavRail({ role, brand, user, venueName }: NavRailProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const path = staffNavLocation(pathname, search ? `?${search}` : '')
  const tree = getStaffNavTree(role)
  const mainItems = tree.filter((node) => node.placement === 'main')
  const footerItems = tree.filter((node) => node.placement === 'footer')
  const routeSection = findOpenStaffNavSection(role, path)
  const sectionKey = `${role}:${path}`
  const [openSection, setOpenSection] = useState<string | null>(routeSection)
  const [trackedSectionKey, setTrackedSectionKey] = useState(sectionKey)

  if (trackedSectionKey !== sectionKey) {
    setTrackedSectionKey(sectionKey)
    setOpenSection(routeSection)
  }

  const sidebarProps = {
    brand,
    mainItems,
    footerItems,
    path,
    openSection,
    onOpenSection: setOpenSection,
    user,
    venueName,
  }

  return (
    <>
      <StaffMobileHeader brand={brand}>
        <StaffSidebarBody {...sidebarProps} />
      </StaffMobileHeader>
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex">
        <StaffSidebarBody {...sidebarProps} />
      </div>
    </>
  )
}

function StaffSidebarBody({
  brand,
  mainItems,
  footerItems,
  path,
  openSection,
  onOpenSection,
  user,
  venueName,
}: {
  brand?: ReactNode
  mainItems: StaffNavNode[]
  footerItems: StaffNavNode[]
  path: string
  openSection: string | null
  onOpenSection: (id: string | null) => void
  user: { email: string | null; name?: string | null; role: Role }
  venueName: string
}) {
  return (
    <aside
      style={{ '--width': `${STAFF_SIDEBAR_WIDTH_PX}px` } as React.CSSProperties}
      className="flex h-full w-full max-w-full flex-col justify-between overflow-auto border-r border-secondary bg-primary pt-4 lg:w-(--width) lg:pt-5"
    >
      <div className="flex flex-col gap-5 px-4 lg:px-5">
        {brand ? <div className="min-w-0">{brand}</div> : null}
      </div>

      <nav aria-label="Primary" className="flex-1">
        <ul className="flex flex-col px-4 pt-5">
          {mainItems.map((node) => (
            <StaffNavNodeRow
              key={node.id}
              node={node}
              path={path}
              open={openSection === node.id}
              onToggle={() =>
                onOpenSection(openSection === node.id ? null : node.id)
              }
            />
          ))}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-3 px-4 py-4 lg:py-5">
        {footerItems.length > 0 ? (
          <ul className="flex flex-col">
            {footerItems.map((node) => (
              <li key={node.id} className="py-px">
                <StaffNavLink
                  href={node.href ?? '#'}
                  label={node.label}
                  icon={node.icon}
                  active={Boolean(node.isActive?.(path))}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <StaffNavAccountCard
          name={user.name}
          email={user.email}
          role={user.role}
          venueName={venueName}
        />
      </div>
    </aside>
  )
}

function StaffNavNodeRow({
  node,
  path,
  open,
  onToggle,
}: {
  node: StaffNavNode
  path: string
  open: boolean
  onToggle: () => void
}) {
  if (node.items?.length) {
    const sectionCurrent = node.items.some((child) => child.isActive(path))
    const Icon = node.icon
    return (
      <li className="py-0.25">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cx(
            'p-2',
            NAV_ITEM_ROOT,
            sectionCurrent && !open && NAV_ITEM_SELECTED,
          )}
        >
          <Icon
            aria-hidden="true"
            className={cx(
              'mr-2 size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover/item:text-fg-quaternary_hover',
              sectionCurrent && !open && 'text-fg-quaternary_hover',
            )}
          />
          <span
            className={cx(
              'flex-1 truncate text-left text-sm font-semibold text-secondary transition-inherit-all group-hover/item:text-secondary_hover',
              sectionCurrent && !open && 'text-secondary_hover',
            )}
          >
            {node.label}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cx(
              'ml-3 size-4 shrink-0 stroke-[2.5px] text-fg-quaternary transition duration-100',
              open && '-scale-y-100',
            )}
          />
        </button>
        {open ? (
          <ul className="pb-1">
            {node.items.map((child) => (
              <li key={child.href} className="py-0.25">
                <StaffNavChildLink child={child} path={path} />
              </li>
            ))}
          </ul>
        ) : null}
      </li>
    )
  }

  if (!node.href) return null

  return (
    <li className="py-px">
      <StaffNavLink
        href={node.href}
        label={node.label}
        icon={node.icon}
        active={Boolean(node.isActive?.(path))}
      />
    </li>
  )
}

function StaffNavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: StaffNavIcon
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cx('p-2', NAV_ITEM_ROOT, active && NAV_ITEM_SELECTED)}
    >
      <Icon
        aria-hidden="true"
        className={cx(
          'mr-2 size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover/item:text-fg-quaternary_hover',
          active && 'text-fg-quaternary_hover',
        )}
      />
      <span
        className={cx(
          'flex-1 truncate text-sm font-semibold text-secondary transition-inherit-all group-hover/item:text-secondary_hover',
          active && 'text-secondary_hover',
        )}
      >
        {label}
      </span>
    </Link>
  )
}

function StaffNavChildLink({
  child,
  path,
}: {
  child: StaffNavLeaf
  path: string
}) {
  const active = child.isActive(path)
  return (
    <Link
      href={child.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'py-2 pr-3 pl-10',
        NAV_ITEM_ROOT,
        active && NAV_ITEM_SELECTED,
      )}
    >
      <span
        className={cx(
          'flex-1 truncate text-sm font-semibold text-secondary transition-inherit-all group-hover/item:text-secondary_hover',
          active && 'text-secondary_hover',
        )}
      >
        {child.label}
      </span>
    </Link>
  )
}
