'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import AuthModal from '@/components/booking/AuthModal'
import StaffHeaderTitle from '@/components/layout/StaffHeaderTitle'
import Button from '@/components/ui/Button'
import { logout } from '@/lib/actions/auth'
import { VENUE_NAME, VENUE_ADDRESS } from '@/lib/venue'
import type { HeaderUser } from '@/lib/header-user'
import { customerDisplayName, getInitials } from '@/lib/staff-booking-utils'

function isEmployeeRole(role: string) {
  return role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN'
}

function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase()
}

type Props = {
  variant: 'booking' | 'staff'
  initialUser: HeaderUser | null
}

export default function AppExperienceHeader({ variant, initialUser }: Props) {
  const router = useRouter()
  const [user, setUser] = useState<HeaderUser | null>(initialUser)
  const [authOpen, setAuthOpen] = useState(false)

  const applyMePayload = useCallback((payload: { user?: Record<string, unknown> } | null) => {
    const u = payload?.user
    if (!u || typeof u.email !== 'string' || typeof u.role !== 'string') {
      setUser(null)
      return
    }
    setUser({
      email: u.email,
      firstName: (u.firstName as string | null | undefined) ?? null,
      lastName: (u.lastName as string | null | undefined) ?? null,
      role: u.role,
    })
  }, [])

  const fetchAndApplyMe = useCallback(
    async (opts: { clearOnFailure: boolean }): Promise<{ user?: { role?: string } } | null> => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) throw new Error('unauthorized')
        const data = await res.json()
        applyMePayload(data)
        return data
      } catch {
        if (opts.clearOnFailure) setUser(null)
        return null
      }
    },
    [applyMePayload]
  )

  useEffect(() => {
    void fetchAndApplyMe({ clearOnFailure: variant === 'booking' })
  }, [variant, fetchAndApplyMe])

  const handleAuthSuccess = () => {
    setAuthOpen(false)
    void fetchAndApplyMe({ clearOnFailure: false }).then((data) => {
      const u = data?.user
      const role = u?.role
      if (role && isEmployeeRole(String(role))) {
        router.push(role === 'ADMIN' ? '/admin' : '/staff')
      }
    })
  }

  if (variant === 'staff') {
    if (!user || !isEmployeeRole(user.role)) {
      return (
        <header className="border-b border-indigo-200 bg-gradient-to-r from-indigo-500 to-blue-500 px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl text-sm text-white/90">Loading…</div>
        </header>
      )
    }

    const iconButtonClass =
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30'
    const settingsHref = '/staff/settings'

    return (
      <header className="staff-user-nav border-b-0 bg-gradient-to-r from-indigo-500 to-blue-500 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-[80px] w-full max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-sm font-semibold leading-tight text-white">{VENUE_NAME}</span>
              <span className="text-xs leading-tight text-white/70">{VENUE_ADDRESS}</span>
            </div>
            <span className="hidden shrink-0 text-white/60 sm:inline" aria-hidden>
              |
            </span>
            <StaffHeaderTitle />
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-white">{customerDisplayName(user)}</p>
              <p className="text-xs leading-tight text-indigo-100">{roleLabel(user.role)}</p>
            </div>
            <div
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white"
              aria-hidden
            >
              {getInitials(user)}
            </div>
            <Link href={settingsHref} className={iconButtonClass} aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="w-full border-b border-gray-200/40 bg-gray-50">
        <div className="mx-auto flex min-h-[4rem] max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold leading-tight text-gray-900">{VENUE_NAME}</span>
            <span className="text-xs leading-tight text-gray-500">{VENUE_ADDRESS}</span>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {user ? (
              <>
                {isEmployeeRole(user.role) ? (
                  <>
                    <Link
                      href="/staff/settings/account-information"
                      className="flex min-w-0 max-w-[min(100%,18rem)] items-center gap-3 rounded-lg px-1 py-0.5 outline-none transition hover:bg-gray-100/80 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 sm:gap-4"
                      aria-label={`Account information, ${customerDisplayName(user)}, ${roleLabel(user.role)}`}
                    >
                      <div className="hidden min-w-0 text-right md:block">
                        <p className="truncate text-sm font-semibold leading-tight text-gray-900">
                          {customerDisplayName(user)}
                        </p>
                        <p className="text-xs text-gray-500">{roleLabel(user.role)}</p>
                      </div>
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 md:h-10 md:w-10 md:text-sm"
                        aria-hidden
                      >
                        {getInitials(user)}
                      </div>
                    </Link>
                    <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                      <form action={logout}>
                        <Button type="submit" variant="secondary" size="sm" className="text-sm">
                          Log out
                        </Button>
                      </form>
                    </nav>
                  </>
                ) : (
                  <>
                    <div className="hidden text-right md:block">
                      <p className="text-sm font-semibold text-gray-900">{customerDisplayName(user)}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 md:h-10 md:w-10 md:text-sm"
                      aria-hidden
                    >
                      {getInitials(user)}
                    </div>
                    <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                      <Link href="/dashboard" className="text-sm font-medium text-[#1A237E] hover:text-[#283593]">
                        My Bookings
                      </Link>
                      <Link href="/profile" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                        Profile
                      </Link>
                      <form action={logout}>
                        <Button type="submit" variant="secondary" size="sm" className="text-sm">
                          Log out
                        </Button>
                      </form>
                    </nav>
                  </>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="text-sm font-medium text-[#1A237E] hover:text-[#283593]"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </>
  )
}
