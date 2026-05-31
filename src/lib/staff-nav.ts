// Unified staff app navigation — one tab bar for STAFF, MANAGER, and ADMIN.
// Route groups (staff) and (admin) stay separate for auth gating; nav is shared.

import {
  BarChart3,
  Calendar,
  ClipboardList,
  Settings,
  type LucideIcon,
} from 'lucide-react'

import type { NavRailItem } from '@/components/chrome/nav-rail'
import type { Role } from '@/types'

type StaffNavDef = {
  href: string
  label: string
  icon: LucideIcon
  roles: Role[]
  isActive: (currentPath: string) => boolean
}

const STAFF_NAV_DEFS: StaffNavDef[] = [
  {
    href: '/staff',
    label: 'Cockpit',
    icon: ClipboardList,
    roles: ['STAFF', 'MANAGER', 'ADMIN'],
    isActive: (path) =>
      path === '/staff' ||
      path.startsWith('/staff/bookings/') ||
      path === '/staff/walkin',
  },
  {
    href: '/staff/schedule',
    label: 'Schedule',
    icon: Calendar,
    roles: ['STAFF', 'MANAGER', 'ADMIN'],
    isActive: (path) => path.startsWith('/staff/schedule'),
  },
  {
    href: '/staff/reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['MANAGER', 'ADMIN'],
    isActive: (path) =>
      path.startsWith('/staff/reports') || path.startsWith('/admin/reports'),
  },
  {
    href: '/staff/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['STAFF', 'MANAGER', 'ADMIN'],
    isActive: (path) =>
      path.startsWith('/staff/settings') ||
      (path.startsWith('/admin') && !path.startsWith('/admin/reports')),
  },
]

/** Primary nav items for the staff app shell, filtered by role. */
export function getStaffNavItems(role: Role): NavRailItem[] {
  return STAFF_NAV_DEFS.filter((item) => item.roles.includes(role)).map(
    ({ href, label, icon, isActive }) => ({
      href,
      label,
      icon,
      isActive,
    }),
  )
}

export type SettingsItem = {
  href: string
  label: string
  sub: string
  viewOnly?: boolean
}

export type SettingsGroup = {
  label: string
  items: SettingsItem[]
}

/** Settings hub list groups — items hidden when role lacks access. */
export function getSettingsGroups(role: Role): SettingsGroup[] {
  const groups: SettingsGroup[] = []

  if (role === 'ADMIN') {
    groups.push({
      label: 'Venue',
      items: [
        {
          href: '/admin/venue',
          label: 'Venue info',
          sub: 'Name, address, contact details',
        },
        {
          href: '/admin/venue',
          label: 'Operating hours',
          sub: 'Open · close · lanes',
        },
      ],
    })
  } else if (role === 'MANAGER') {
    groups.push({
      label: 'Venue',
      items: [
        {
          href: '/admin/venue',
          label: 'Operating hours',
          sub: 'Open · close · lanes',
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
          href: '/admin/packages',
          label: 'Packages',
          sub: 'Rates, inclusions, and availability',
        },
        {
          href: '/admin/promos',
          label: 'Promo codes',
          sub: 'Discount codes for online booking',
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
          viewOnly: true,
        },
      ],
    })
  }

  if (role === 'ADMIN') {
    groups.push({
      label: 'Team',
      items: [
        {
          href: '/admin/team',
          label: 'Team',
          sub: 'Staff members and roles',
        },
      ],
    })
    groups.push({
      label: 'System',
      items: [
        {
          href: '/admin/audit',
          label: 'Audit log',
          sub: 'Settings change history',
        },
      ],
    })
  }

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
