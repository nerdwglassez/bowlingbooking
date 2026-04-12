'use client'

import { usePathname } from 'next/navigation'

const ADMIN_TITLES: Record<string, string> = {
  '/admin': 'Admin',
  '/admin/settings': 'Settings',
  '/admin/operating-hours': 'Operating Hours',
  '/admin/special-hours': 'Special Hours',
  '/admin/lane-blocks': 'Lane Blocks',
  '/admin/packages': 'Packages',
  '/admin/marketing': 'Marketing',
  '/admin/api-keys': 'API Keys',
  '/admin/products': 'Products',
  '/admin/discount-codes': 'Discount codes',
}

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
  '/staff/settings/discount-codes': 'Discount codes',
  '/staff/settings/lanes': 'Lanes',
  '/staff/settings/pricing': 'Pricing',
  '/staff/settings/operating-hours': 'Operating Hours',
  '/staff/settings/blackout-dates': 'Blackout Dates',
  '/staff/pending-overrides': 'Pending Overrides',
  '/staff/audit-log': 'Audit Log',
}

function getTitle(pathname: string): string {
  if (pathname.startsWith('/admin')) {
    if (ADMIN_TITLES[pathname]) return ADMIN_TITLES[pathname]
    if (pathname.startsWith('/admin/packages/create')) return 'Create Package'
    if (/^\/admin\/packages\/[^/]+$/.test(pathname)) return 'Edit Package'
    if (pathname.startsWith('/admin/products/create')) return 'Create Product'
    if (/^\/admin\/products\/[^/]+$/.test(pathname)) return 'Edit Product'
    return 'Admin'
  }
  if (STAFF_TITLES[pathname]) return STAFF_TITLES[pathname]
  if (pathname.startsWith('/staff/bookings/create')) return 'Create Booking'
  if (pathname.includes('/staff/bookings/') && pathname.endsWith('/edit')) return 'Edit Booking'
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
