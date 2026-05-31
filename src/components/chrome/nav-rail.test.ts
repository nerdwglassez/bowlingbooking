import { describe, expect, it } from 'vitest'

import { isNavItemActive } from '@/components/chrome/nav-rail'
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
