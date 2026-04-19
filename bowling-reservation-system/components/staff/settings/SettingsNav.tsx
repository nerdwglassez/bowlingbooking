'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import {
  CalendarClock,
  CalendarX2,
  CircleDollarSign,
  Link2,
  LogOut,
  Package,
  Percent,
  Settings,
  UserCircle2,
  Users,
} from 'lucide-react'
import type { ComponentType } from 'react'

const SETTINGS_ITEMS = [
  { href: '/staff/settings/account-information', label: 'Account Information', icon: UserCircle2 },
  { href: '/staff/settings/user-management', label: 'User Management', icon: Users },
  { href: '/staff/settings/integrations', label: 'Integrations', icon: Link2 },
  { href: '/staff/settings/operating-hours', label: 'Operating Hours', icon: CalendarClock },
  { href: '/staff/settings/lanes', label: 'Lanes', icon: Settings },
  { href: '/staff/settings/pricing', label: 'Pricing', icon: CircleDollarSign },
  { href: '/staff/settings/blackout-dates', label: 'Blackout Dates', icon: CalendarX2 },
  { href: '/staff/settings/packages', label: 'Packages', icon: Package },
  { href: '/staff/settings/discount-codes', label: 'Discount codes', icon: Percent },
] as const

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-2 rounded-[14px] px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 ring-1 ring-indigo-100'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-[10px] ${
          active ? 'bg-indigo-100' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </Link>
  )
}

export default function SettingsNav() {
  const pathname = usePathname()

  return (
    <aside className="rounded-2xl border border-slate-200/80 bg-white p-4">
      <nav className="space-y-1">
        {SETTINGS_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={(pathname?.startsWith(item.href) ?? false) || (pathname === '/staff/settings' && item.href === '/staff/settings/account-information')}
          />
        ))}
      </nav>
      <div className="mt-4 border-t border-slate-200 pt-4">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
