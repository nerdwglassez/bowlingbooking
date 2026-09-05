import { describe, expect, it } from 'vitest'

import {
  findOpenStaffNavSection,
  formatStaffRole,
  getSettingsGroups,
  getSettingsSectionItems,
  getStaffNavItems,
  getStaffNavTree,
  matchSettingsSectionHref,
  staffNavInitials,
  staffNavLocation,
  toSettingsSidebarGroups,
} from '@/lib/staff-nav'

describe('getStaffNavItems', () => {
  it('shows overview, scheduling, settings, and support leaves for STAFF', () => {
    const items = getStaffNavItems('STAFF')
    expect(items.map((i) => i.label)).toEqual([
      'Dashboard',
      'Lane Assignments',
      'Calendar',
      'Reservation List',
      'Settings',
      'Support',
    ])
  })

  it('hides reporting and contacts for STAFF', () => {
    const labels = getStaffNavItems('STAFF').map((i) => i.label)
    expect(labels).not.toContain('Reporting')
    expect(labels).not.toContain('Contacts')
  })

  it('includes reporting and contacts for MANAGER and ADMIN', () => {
    expect(getStaffNavItems('MANAGER').map((i) => i.label)).toEqual(
      expect.arrayContaining(['Reporting', 'Contacts']),
    )
    expect(getStaffNavItems('ADMIN').map((i) => i.label)).toEqual(
      expect.arrayContaining(['Reporting', 'Contacts']),
    )
  })

  it('marks admin and staff settings routes as settings-active', () => {
    const settings = getStaffNavItems('ADMIN').find(
      (i) => i.label === 'Settings',
    )
    expect(settings?.isActive?.('/admin/packages')).toBe(true)
    expect(settings?.isActive?.('/staff/settings/venue')).toBe(true)
    expect(settings?.isActive?.('/admin/reports')).toBe(false)
    expect(settings?.isActive?.('/staff/reports')).toBe(false)
  })

  it('marks walk-in as dashboard-active', () => {
    const dashboard = getStaffNavItems('STAFF').find(
      (i) => i.label === 'Dashboard',
    )
    expect(dashboard?.isActive?.('/staff/walkin')).toBe(true)
    expect(dashboard?.isActive?.('/staff/schedule')).toBe(false)
  })

  it('splits cockpit and schedule query views onto sibling leaves', () => {
    const items = getStaffNavItems('STAFF')
    const dashboard = items.find((i) => i.label === 'Dashboard')
    const lanes = items.find((i) => i.label === 'Lane Assignments')
    const calendar = items.find((i) => i.label === 'Calendar')
    const list = items.find((i) => i.label === 'Reservation List')
    expect(dashboard?.isActive?.('/staff')).toBe(true)
    expect(dashboard?.isActive?.('/staff?view=lanes')).toBe(false)
    expect(lanes?.isActive?.('/staff?view=lanes')).toBe(true)
    expect(calendar?.isActive?.('/staff/schedule')).toBe(true)
    expect(calendar?.isActive?.('/staff/schedule?view=list')).toBe(false)
    expect(list?.isActive?.('/staff/schedule?view=list')).toBe(true)
  })

  it('marks reporting inactive on contacts routes', () => {
    const reporting = getStaffNavItems('MANAGER').find(
      (i) => i.label === 'Reporting',
    )
    expect(reporting?.isActive?.('/staff')).toBe(false)
    expect(reporting?.isActive?.('/staff/schedule')).toBe(false)
    expect(reporting?.isActive?.('/staff/reports')).toBe(true)
    expect(reporting?.isActive?.('/staff/reports?view=contacts')).toBe(false)
    expect(reporting?.isActive?.('/staff/reports/contacts/a%40b.com')).toBe(
      false,
    )
  })
})

describe('getStaffNavTree', () => {
  it('groups overview and scheduling as exclusive accordion parents', () => {
    const tree = getStaffNavTree('STAFF')
    expect(tree.map((n) => n.id)).toEqual([
      'overview',
      'scheduling',
      'settings',
      'support',
    ])
    expect(tree[0]?.items?.map((i) => i.label)).toEqual([
      'Dashboard',
      'Lane Assignments',
    ])
    expect(tree[1]?.items?.map((i) => i.label)).toEqual([
      'Calendar',
      'Reservation List',
    ])
  })
})

describe('findOpenStaffNavSection', () => {
  it('opens overview for dashboard and lanes, scheduling for calendar and list', () => {
    expect(findOpenStaffNavSection('STAFF', '/staff')).toBe('overview')
    expect(findOpenStaffNavSection('STAFF', '/staff?view=lanes')).toBe(
      'overview',
    )
    expect(findOpenStaffNavSection('STAFF', '/staff/schedule')).toBe(
      'scheduling',
    )
    expect(findOpenStaffNavSection('STAFF', '/staff/schedule?view=list')).toBe(
      'scheduling',
    )
    expect(findOpenStaffNavSection('STAFF', '/staff/settings')).toBeNull()
  })
})

describe('staffNavLocation', () => {
  it('joins pathname and search for active matchers', () => {
    expect(staffNavLocation('/staff', '')).toBe('/staff')
    expect(staffNavLocation('/staff', '?view=lanes')).toBe('/staff?view=lanes')
    expect(staffNavLocation('/staff', 'view=lanes')).toBe('/staff?view=lanes')
  })
})

describe('staffNavInitials', () => {
  it('uses first and last name, then email local part', () => {
    expect(staffNavInitials('Ada Lovelace', 'ada@x.com')).toBe('AL')
    expect(staffNavInitials(null, 'front.desk@x.com')).toBe('FR')
  })
})

describe('getSettingsGroups', () => {
  it('shows view-only venue and booking items for STAFF', () => {
    const groups = getSettingsGroups('STAFF')
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).toContain('Operating hours')
    expect(labels).toContain('Packages')
    expect(labels).toContain('Profile')
    expect(labels).toContain('Sign out')
    expect(
      groups
        .flatMap((g) => g.items)
        .filter((i) => i.label !== 'Profile' && i.action !== 'sign-out')
        .every((i) => i.viewOnly === true),
    ).toBe(true)
  })

  it('shows venue sub-pages and integrations for ADMIN', () => {
    const labels = getSettingsGroups('ADMIN').flatMap((g) =>
      g.items.map((i) => i.label),
    )
    expect(labels).toContain('Venue info')
    expect(labels).toContain('Operating hours')
    expect(labels).toContain('Pricing')
    expect(labels).toContain('Booking policies')
    expect(labels).toContain('Integrations')
    expect(labels).not.toContain('Promo codes')
  })

  it('shows team for MANAGER but not integrations', () => {
    const adminLabels = getSettingsGroups('ADMIN').flatMap((g) => g.label)
    const managerLabels = getSettingsGroups('MANAGER').flatMap((g) => g.label)
    expect(adminLabels).toContain('Team')
    expect(adminLabels).toContain('Integrations')
    expect(managerLabels).toContain('Team')
    expect(managerLabels).not.toContain('Integrations')
    expect(
      getSettingsGroups('MANAGER').flatMap((g) => g.items.map((i) => i.label)),
    ).toContain('Pricing')
  })
})

describe('getSettingsSectionItems', () => {
  it('puts Profile first and role-filters the rest for ADMIN', () => {
    expect(getSettingsSectionItems('ADMIN').map((i) => i.label)).toEqual([
      'Profile',
      'Venue info',
      'Operating hours',
      'Pricing',
      'Packages',
      'Booking policies',
      'Team',
      'Integrations',
    ])
  })

  it('hides admin-only sections for STAFF', () => {
    expect(getSettingsSectionItems('STAFF').map((i) => i.label)).toEqual([
      'Profile',
      'Operating hours',
      'Packages',
    ])
  })

  it('hides venue info and integrations for MANAGER', () => {
    expect(getSettingsSectionItems('MANAGER').map((i) => i.label)).toEqual([
      'Profile',
      'Operating hours',
      'Pricing',
      'Packages',
      'Booking policies',
      'Team',
    ])
  })
})

describe('matchSettingsSectionHref', () => {
  const admin = getSettingsSectionItems('ADMIN')

  it('matches nested package routes to Packages', () => {
    expect(
      matchSettingsSectionHref('/staff/settings/packages/new', admin),
    ).toBe('/staff/settings/packages')
  })
})

describe('toSettingsSidebarGroups', () => {
  it('strips non-serializable icon components for client layout props', () => {
    const sidebar = toSettingsSidebarGroups(getSettingsGroups('ADMIN'))
    expect(sidebar[0]?.items[0]).toEqual({
      href: '/staff/settings/venue',
      label: 'Venue info',
      action: undefined,
    })
    for (const group of sidebar) {
      for (const item of group.items) {
        expect(item).not.toHaveProperty('icon')
      }
    }
  })
})

describe('formatStaffRole', () => {
  it('formats role labels for the shell badge', () => {
    expect(formatStaffRole('STAFF')).toBe('Staff')
    expect(formatStaffRole('MANAGER')).toBe('Manager')
    expect(formatStaffRole('ADMIN')).toBe('Admin')
  })
})
