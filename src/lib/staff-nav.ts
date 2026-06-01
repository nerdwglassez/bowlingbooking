import {
  BarChart3,
  Calendar,
  ClipboardList,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Home,
  Package,
  Settings,
  User,
  Users,
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
  href?: string
  label: string
  sub: string
  icon: LucideIcon
  viewOnly?: boolean
  variant?: 'default' | 'danger'
  action?: 'sign-out'
}

export type SettingsGroup = {
  label: string
  items: SettingsItem[]
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
          icon: Home,
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
          icon: DollarSign,
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
          icon: DollarSign,
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
          icon: FileText,
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

  if (role === 'ADMIN') {
    groups.push({
      label: 'Team',
      items: [
        {
          href: '/staff/settings/team',
          label: 'Team',
          sub: teamSub,
          icon: Users,
        },
      ],
    })
    groups.push({
      label: 'Integrations',
      items: [
        {
          href: '/staff/settings/integrations',
          label: 'Integrations',
          sub: meta?.integrationsSummary ?? 'Stripe · automation · email',
          icon: ExternalLink,
        },
      ],
    })
  }

  groups.push({
    label: 'Account',
    items: [
      {
        href: '/staff/settings/profile',
        label: 'My profile',
        sub: 'Name · email · password',
        icon: User,
      },
      {
        label: 'Sign out',
        sub: '',
        icon: User,
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
