import { describe, expect, it } from 'vitest'

import { isNavItemActive, getStaffNavItems } from '@/lib/staff-nav'

describe('isNavItemActive', () => {
  it('activates only one primary tab per staff route', () => {
    const items = getStaffNavItems('MANAGER')
    const paths = [
      '/staff',
      '/staff?view=lanes',
      '/staff/schedule',
      '/staff/schedule?view=list',
      '/staff/reports',
      '/staff/reports?view=contacts',
      '/staff/reports/contacts/foo',
      '/staff/settings',
      '/staff/support',
      '/admin/venue',
    ]

    for (const path of paths) {
      const active = items.filter((item) => isNavItemActive(item, path))
      expect(active, path).toHaveLength(1)
    }
  })

  it('marks contacts active on contact detail routes', () => {
    const contacts = getStaffNavItems('MANAGER').find(
      (i) => i.label === 'Contacts',
    )
    expect(
      isNavItemActive(contacts!, '/staff/reports/contacts/test%40email.com'),
    ).toBe(true)
    expect(isNavItemActive(contacts!, '/staff/reports')).toBe(false)
  })

  it('marks dashboard active for booking detail', () => {
    const dashboard = getStaffNavItems('MANAGER').find(
      (i) => i.label === 'Dashboard',
    )
    expect(isNavItemActive(dashboard!, '/staff/bookings/bk_1')).toBe(true)
    expect(isNavItemActive(dashboard!, '/staff/reports')).toBe(false)
  })
})
