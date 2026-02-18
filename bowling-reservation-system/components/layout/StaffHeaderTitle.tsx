'use client'

import { usePathname } from 'next/navigation'

const STAFF_TITLES: Record<string, string> = {
  '/staff': 'Dashboard',
  '/staff/bookings': 'Bookings',
  '/staff/calendar': 'Booking Calendar',
  '/staff/reports': 'Reports',
  '/staff/customers': 'Customers',
  '/staff/check-in': 'Check In',
  '/staff/settings': 'Settings',
  '/staff/settings/account-information': 'Account Info',
  '/staff/settings/user-management': 'User Management',
  '/staff/settings/packages': 'Packages',
  '/staff/settings/lanes': 'Lanes',
  '/staff/settings/pricing': 'Pricing',
  '/staff/settings/operating-hours': 'Operating Hours',
  '/staff/settings/blackout-dates': 'Blackout Dates',
  '/staff/pending-overrides': 'Pending Overrides',
  '/staff/audit-log': 'Audit Log',
  '/staff/analytics': 'Analytics',
}

function getTitle(pathname: string): string {
  if (STAFF_TITLES[pathname]) return STAFF_TITLES[pathname]
  if (pathname.startsWith('/staff/bookings/create')) return 'Create Booking'
  if (pathname.startsWith('/staff/bookings/') && pathname !== '/staff/bookings') return 'Booking'
  if (pathname.startsWith('/staff/customers/') && pathname !== '/staff/customers') return 'Customer'
  if (pathname.startsWith('/staff/settings/')) return 'Settings'
  return 'Dashboard'
}

export default function StaffHeaderTitle() {
  const pathname = usePathname() ?? ''
  const title = getTitle(pathname)

  return (
    <span className="hidden shrink-0 text-sm font-semibold tracking-tight text-white/95 sm:inline sm:text-base">
      {title}
    </span>
  )
}
