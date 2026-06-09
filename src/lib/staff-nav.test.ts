import { describe, expect, it } from 'vitest'

import {
  formatStaffRole,
  getSettingsGroups,
  getStaffNavItems,
  toSettingsSidebarGroups,
} from '@/lib/staff-nav'

describe('getStaffNavItems', () => {
  it('shows cockpit, schedule, and settings for STAFF', () => {
    const items = getStaffNavItems('STAFF')
    expect(items.map((i) => i.label)).toEqual([
      'Cockpit',
      'Schedule',
      'Settings',
    ])
  })

  it('includes reports for MANAGER and ADMIN', () => {
    expect(getStaffNavItems('MANAGER').map((i) => i.label)).toContain(
      'Reports',
    )
    expect(getStaffNavItems('ADMIN').map((i) => i.label)).toContain('Reports')
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

  it('marks walk-in as cockpit-active', () => {
    const cockpit = getStaffNavItems('STAFF').find((i) => i.label === 'Cockpit')
    expect(cockpit?.isActive?.('/staff/walkin')).toBe(true)
    expect(cockpit?.isActive?.('/staff/schedule')).toBe(false)
  })

  it('marks reports inactive when on cockpit', () => {
    const reports = getStaffNavItems('MANAGER').find((i) => i.label === 'Reports')
    expect(reports?.isActive?.('/staff')).toBe(false)
    expect(reports?.isActive?.('/staff/schedule')).toBe(false)
    expect(reports?.isActive?.('/staff/reports')).toBe(true)
  })
})

describe('getSettingsGroups', () => {
  it('shows view-only venue and booking items for STAFF', () => {
    const groups = getSettingsGroups('STAFF')
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).toContain('Operating hours')
    expect(labels).toContain('Packages')
    expect(labels).toContain('My profile')
    expect(labels).toContain('Sign out')
    expect(
      groups
        .flatMap((g) => g.items)
        .filter((i) => i.label !== 'My profile' && i.action !== 'sign-out')
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
