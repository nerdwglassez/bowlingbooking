import { describe, expect, it } from 'vitest'

import { isNavItemActive } from '@/components/chrome/nav-rail'
import { shouldGuardSettingsNavigation } from '@/components/chrome/settings-nav-guard'
import { getStaffNavItems } from '@/lib/staff-nav'

describe('isNavItemActive', () => {
  it('activates only one primary tab per staff route', () => {
    const items = getStaffNavItems('MANAGER')
    const paths = [
      '/staff',
      '/staff/schedule',
      '/staff/reports',
      '/staff/reports/contacts/foo',
      '/staff/settings',
      '/admin/venue',
    ]

    for (const path of paths) {
      const active = items.filter((item) => isNavItemActive(item, path))
      expect(active).toHaveLength(1)
    }
  })

  it('marks reports active on contact detail routes', () => {
    const reports = getStaffNavItems('MANAGER').find((i) => i.label === 'Reports')
    expect(
      isNavItemActive(reports!, '/staff/reports/contacts/test%40email.com'),
    ).toBe(true)
    expect(isNavItemActive(reports!, '/staff')).toBe(false)
  })

  it('marks cockpit active for booking detail', () => {
    const cockpit = getStaffNavItems('MANAGER').find((i) => i.label === 'Cockpit')
    expect(isNavItemActive(cockpit!, '/staff/bookings/bk_1')).toBe(true)
    expect(isNavItemActive(cockpit!, '/staff/reports')).toBe(false)
  })
})

describe('settings navigation guard', () => {
  it('guards primary NavRail destinations while a settings form is dirty', () => {
    expect(shouldGuardSettingsNavigation('/staff', true)).toBe(true)
    expect(shouldGuardSettingsNavigation('/staff/schedule', true)).toBe(true)
    expect(shouldGuardSettingsNavigation('/staff/reports', true)).toBe(true)
  })

  it('continues to guard settings links outside the primary NavRail', () => {
    expect(
      shouldGuardSettingsNavigation('/staff/settings/team', false),
    ).toBe(true)
    expect(shouldGuardSettingsNavigation('/staff/bookings/bk_1', false)).toBe(
      false,
    )
  })
})
