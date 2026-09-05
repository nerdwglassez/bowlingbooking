import type { FC, SVGProps } from 'react'
import {
  BarChart01,
  Calendar,
  Clock,
  CurrencyDollar,
  File06,
  Home01,
  LifeBuoy01,
  LinkExternal01,
  Package,
  Settings01,
  User01,
  Users01,
} from '@untitledui/icons'

import type { Role } from '@/types'

type StaffIcon = FC<SVGProps<SVGSVGElement>>

function staffUrl(path: string): URL {
  return new URL(path, 'http://staff.local')
}

export type StaffNavLeaf = {
  href: string
  label: string
  isActive: (path: string) => boolean
}

export type StaffNavNode = {
  id: string
  label: string
  icon: StaffIcon
  href?: string
  roles: Role[]
  placement: 'main' | 'footer'
  isActive?: (path: string) => boolean
  items?: StaffNavLeaf[]
}

const STAFF_NAV_TREE: StaffNavNode[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home01,
    roles: ['STAFF', 'MANAGER', 'ADMIN'],
    placement: 'main',
    items: [
      {
        href: '/staff',
        label: 'Dashboard',
        isActive: (path) => {
          const url = staffUrl(path)
          if (
            url.pathname.startsWith('/staff/bookings/') ||
            url.pathname === '/staff/walkin'
          ) {
            return true
          }
          return (
            url.pathname === '/staff' && url.searchParams.get('view') !== 'lanes'
          )
        },
      },
      {
        href: '/staff?view=lanes',
        label: 'Lane Assignments',
        isActive: (path) => {
          const url = staffUrl(path)
          return (
            url.pathname === '/staff' && url.searchParams.get('view') === 'lanes'
          )
        },
      },
    ],
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: Calendar,
    roles: ['STAFF', 'MANAGER', 'ADMIN'],
    placement: 'main',
    items: [
      {
        href: '/staff/schedule',
        label: 'Calendar',
        isActive: (path) => {
          const url = staffUrl(path)
          return (
            url.pathname.startsWith('/staff/schedule') &&
            url.searchParams.get('view') !== 'list'
          )
        },
      },
      {
        href: '/staff/schedule?view=list',
        label: 'Reservation List',
        isActive: (path) => {
          const url = staffUrl(path)
          return (
            url.pathname.startsWith('/staff/schedule') &&
            url.searchParams.get('view') === 'list'
          )
        },
      },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: BarChart01,
    href: '/staff/reports',
    roles: ['MANAGER', 'ADMIN'],
    placement: 'main',
    isActive: (path) => {
      const url = staffUrl(path)
      if (url.pathname.startsWith('/staff/reports/contacts')) return false
      if (url.searchParams.get('view') === 'contacts') return false
      return (
        url.pathname.startsWith('/staff/reports') ||
        url.pathname.startsWith('/admin/reports')
      )
    },
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Users01,
    href: '/staff/reports?view=contacts',
    roles: ['MANAGER', 'ADMIN'],
    placement: 'main',
    isActive: (path) => {
      const url = staffUrl(path)
      return (
        url.pathname.startsWith('/staff/reports/contacts') ||
        (url.pathname.startsWith('/staff/reports') &&
          url.searchParams.get('view') === 'contacts')
      )
    },
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings01,
    href: '/staff/settings',
    roles: ['STAFF', 'MANAGER', 'ADMIN'],
    placement: 'footer',
    isActive: (path) => {
      const url = staffUrl(path)
      return (
        url.pathname.startsWith('/staff/settings') ||
        (url.pathname.startsWith('/admin') &&
          !url.pathname.startsWith('/admin/reports'))
      )
    },
  },
  {
    id: 'support',
    label: 'Support',
    icon: LifeBuoy01,
    href: '/staff/support',
    roles: ['STAFF', 'MANAGER', 'ADMIN'],
    placement: 'footer',
    isActive: (path) => staffUrl(path).pathname.startsWith('/staff/support'),
  },
]

/** Untitled-shaped staff sidebar, filtered by role. */
export function getStaffNavTree(role: Role): StaffNavNode[] {
  return STAFF_NAV_TREE.filter((item) => item.roles.includes(role)).map(
    (item) => ({
      ...item,
      items: item.items ? [...item.items] : undefined,
    }),
  )
}

export type StaffNavItem = {
  href: string
  label: string
  icon: StaffIcon
  isActive?: (path: string) => boolean
}

/** Leaf links for active-path tests and compact mobile fallbacks. */
export function getStaffNavItems(role: Role): StaffNavItem[] {
  const leaves: StaffNavItem[] = []
  for (const node of getStaffNavTree(role)) {
    if (node.items?.length) {
      for (const child of node.items) {
        leaves.push({
          href: child.href,
          label: child.label,
          icon: node.icon,
          isActive: child.isActive,
        })
      }
    } else if (node.href) {
      leaves.push({
        href: node.href,
        label: node.label,
        icon: node.icon,
        isActive: node.isActive,
      })
    }
  }
  return leaves
}

export function staffNavLocation(pathname: string, search = ''): string {
  if (!search || search === '?') return pathname
  return `${pathname}${search.startsWith('?') ? search : `?${search}`}`
}

export function isNavItemActive(item: StaffNavItem, currentPath: string): boolean {
  if (item.isActive) return item.isActive(currentPath)
  if (item.href === currentPath) return true
  const [hrefPath] = item.href.split('?')
  if (!hrefPath) return false
  return currentPath === hrefPath || currentPath.startsWith(`${hrefPath}/`)
}

export function findOpenStaffNavSection(
  role: Role,
  path: string,
): string | null {
  for (const node of getStaffNavTree(role)) {
    if (!node.items?.length) continue
    if (node.items.some((child) => child.isActive(path))) return node.id
  }
  return null
}

/** Two-letter avatar initials from a staff display name or email. */
export function staffNavInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const first = parts[0]?.[0]
    const last = parts[parts.length - 1]?.[0]
    if (first && last) return `${first}${last}`.toUpperCase()
  }
  if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase()
  const local = (email ?? '').split('@')[0] ?? ''
  if (local.length >= 2) return local.slice(0, 2).toUpperCase()
  if (local.length === 1) return `${local}${local}`.toUpperCase()
  return 'SZ'
}

export type SettingsItem = {
  href?: string
  label: string
  sub: string
  icon: StaffIcon
  viewOnly?: boolean
  variant?: 'default' | 'danger'
  action?: 'sign-out'
}

export type SettingsGroup = {
  label: string
  items: SettingsItem[]
}

/** Serializable settings nav for client components (no icon components). */
export type SettingsSidebarItem = {
  href?: string
  label: string
  action?: 'sign-out'
}

export type SettingsSidebarGroup = {
  label: string
  items: SettingsSidebarItem[]
}

/** Strip non-serializable fields before passing settings nav to client components. */
export function toSettingsSidebarGroups(
  groups: SettingsGroup[],
): SettingsSidebarGroup[] {
  return groups.map((group) => ({
    label: group.label,
    items: group.items.map(({ href, label, action }) => ({
      href,
      label,
      action,
    })),
  }))
}

export type SettingsHubMeta = {
  packageCount: number
  teamCount: number
  integrationsSummary: string
}

/** Settings hub list groups — items hidden when role lacks access. */
export function getSettingsGroups(
  role: Role,
  meta?: SettingsHubMeta,
): SettingsGroup[] {
  const groups: SettingsGroup[] = []
  const packageSub =
    meta && meta.packageCount > 0
      ? `${meta.packageCount} package${meta.packageCount === 1 ? '' : 's'}`
      : 'Rates, inclusions, and availability'
  const teamSub =
    meta && meta.teamCount > 0
      ? `${meta.teamCount} staff member${meta.teamCount === 1 ? '' : 's'}`
      : 'Staff members and roles'

  if (role === 'ADMIN') {
    groups.push({
      label: 'Venue',
      items: [
        {
          href: '/staff/settings/venue',
          label: 'Venue info',
          sub: 'Name, address, contact details',
          icon: Home01,
        },
        {
          href: '/staff/settings/hours',
          label: 'Operating hours',
          sub: 'Open · close · lanes',
          icon: Clock,
        },
        {
          href: '/staff/settings/pricing',
          label: 'Pricing',
          sub: 'Strategy · rates · overrides',
          icon: CurrencyDollar,
        },
      ],
    })
  } else if (role === 'MANAGER') {
    groups.push({
      label: 'Venue',
      items: [
        {
          href: '/staff/settings/hours',
          label: 'Operating hours',
          sub: 'Open · close · lanes',
          icon: Clock,
        },
        {
          href: '/staff/settings/pricing',
          label: 'Pricing',
          sub: 'Strategy · rates · overrides',
          icon: CurrencyDollar,
        },
      ],
    })
  } else {
    groups.push({
      label: 'Venue',
      items: [
        {
          href: '/staff/settings/hours',
          label: 'Operating hours',
          sub: 'View only',
          icon: Clock,
          viewOnly: true,
        },
      ],
    })
  }

  if (role === 'ADMIN' || role === 'MANAGER') {
    groups.push({
      label: 'Booking',
      items: [
        {
          href: '/staff/settings/packages',
          label: 'Packages',
          sub: packageSub,
          icon: Package,
        },
        {
          href: '/staff/settings/policies',
          label: 'Booking policies',
          sub: 'Hold time · cancellation window',
          icon: File06,
        },
      ],
    })
  } else {
    groups.push({
      label: 'Booking',
      items: [
        {
          href: '/staff/settings/packages',
          label: 'Packages',
          sub: 'View only',
          icon: Package,
          viewOnly: true,
        },
      ],
    })
  }

  if (role === 'ADMIN' || role === 'MANAGER') {
    groups.push({
      label: 'Team',
      items: [
        {
          href: '/staff/settings/team',
          label: 'Team',
          sub:
            role === 'MANAGER'
              ? 'Staff profiles and access'
              : teamSub,
          icon: Users01,
        },
      ],
    })
  }

  if (role === 'ADMIN') {
    groups.push({
      label: 'Integrations',
      items: [
        {
          href: '/staff/settings/integrations',
          label: 'Integrations',
          sub: meta?.integrationsSummary ?? 'Stripe · automation · email',
          icon: LinkExternal01,
        },
      ],
    })
  }

  groups.push({
    label: 'Account',
    items: [
        {
          href: '/staff/settings/profile',
          label: 'Profile',
          sub: 'Name · email · password',
          icon: User01,
        },
      {
        label: 'Sign out',
        sub: '',
        icon: User01,
        variant: 'danger',
        action: 'sign-out',
      },
    ],
  })

  return groups
}

/** Human-readable role label for the shell header/footer badge. */
export function formatStaffRole(role: Role): string {
  switch (role) {
    case 'ADMIN':
      return 'Admin'
    case 'MANAGER':
      return 'Manager'
    case 'STAFF':
      return 'Staff'
    default:
      return role
  }
}

const SETTINGS_SECTION_ORDER = [
  '/staff/settings/profile',
  '/staff/settings/venue',
  '/staff/settings/hours',
  '/staff/settings/pricing',
  '/staff/settings/packages',
  '/staff/settings/policies',
  '/staff/settings/team',
  '/staff/settings/integrations',
] as const

export type SettingsSectionItem = {
  href: string
  label: string
}

/** Role-filtered settings sections in Figma tab order. */
export function getSettingsSectionItems(role: Role): SettingsSectionItem[] {
  const byHref = new Map(
    getSettingsGroups(role)
      .flatMap((group) => group.items)
      .filter((item): item is SettingsItem & { href: string } =>
        Boolean(item.href),
      )
      .map((item) => [item.href, item.label]),
  )

  return SETTINGS_SECTION_ORDER.filter((href) => byHref.has(href)).map(
    (href) => ({
      href,
      label: byHref.get(href) ?? href,
    }),
  )
}

/** Active section href for a settings pathname (handles nested package routes). */
export function matchSettingsSectionHref(
  pathname: string,
  sections: SettingsSectionItem[],
): string {
  const exact = sections.find((item) => item.href === pathname)
  if (exact) return exact.href

  const nested = sections.find(
    (item) =>
      item.href !== '/staff/settings' &&
      pathname.startsWith(`${item.href}/`),
  )
  return nested?.href ?? sections[0]?.href ?? '/staff/settings/profile'
}
