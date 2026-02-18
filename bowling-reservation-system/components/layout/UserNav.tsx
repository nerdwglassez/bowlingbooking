import { getSession } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import { prisma } from '@/lib/db'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import StaffHeaderTitle from '@/components/layout/StaffHeaderTitle'
import { VENUE_NAME } from '@/lib/venue'

export default async function UserNav() {
  const session = await getSession()
  
  if (!session) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      email: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  })

  if (!user) {
    return null
  }

  const isEmployee = user.role === 'STAFF' || user.role === 'MANAGER' || user.role === 'ADMIN'
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email
  const roleLabel = user.role.charAt(0) + user.role.slice(1).toLowerCase()
  const initialsFromName = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('')
  const initials = (initialsFromName || user.email.slice(0, 2)).toUpperCase()
  const settingsHref = '/staff/settings'

  if (isEmployee) {
    const iconButtonClass = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30'
    return (
      <header className="staff-user-nav border-b-0 bg-gradient-to-r from-indigo-500 to-blue-500 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-[80px] w-full max-w-7xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="shrink-0 text-[32px] font-bold tracking-tight text-white">
              {VENUE_NAME}
            </span>
            <span className="hidden shrink-0 text-white/60 sm:inline" aria-hidden>|</span>
            <StaffHeaderTitle />
          </div>

          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-white">{displayName}</p>
              <p className="text-xs leading-tight text-indigo-100">{roleLabel}</p>
            </div>
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              {initials}
            </div>
            <Link
              href={settingsHref}
              className={iconButtonClass}
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Logged in as: <span className="font-medium text-gray-900">{user.email}</span>
              </span>
              <a href="/profile" className="text-sm text-blue-600 hover:underline">
                Profile
              </a>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">
                {user.role.toLowerCase()}
              </span>
            </div>
            <form action={logout}>
            <Button type="submit" variant="secondary" className="text-sm">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}


