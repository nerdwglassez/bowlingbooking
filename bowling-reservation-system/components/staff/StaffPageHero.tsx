'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { customerDisplayName, getInitials } from '@/lib/staff-booking-utils'

type GradientVariant = 'reports' | 'calendar' | 'settings'

const GRADIENT_CLASSES: Record<GradientVariant, string> = {
  reports: 'from-[#3B82F6] to-[#06B6D4]',
  calendar: 'from-indigo-500 to-blue-500',
  settings: 'from-[#10B981] to-[#14B8A6]',
}

const SUBTITLE_CLASSES: Record<GradientVariant, string> = {
  reports: 'text-indigo-100',
  calendar: 'text-indigo-100',
  settings: 'text-white/90',
}

interface StaffPageHeroProps {
  title: string
  description: string
  gradient: GradientVariant
}

interface MeUser {
  user?: {
    firstName?: string | null
    lastName?: string | null
    email: string
    role: string
  }
}

export default function StaffPageHero({ title, description, gradient }: StaffPageHeroProps) {
  const [user, setUser] = useState<MeUser['user'] | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeUser) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  const displayName = user ? customerDisplayName(user) : ''
  const roleLabel = user ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : ''
  const initials = user ? getInitials(user) : ''

  return (
    <section
      className={`relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen -mt-6 bg-gradient-to-r ${GRADIENT_CLASSES[gradient]} px-6 py-6 text-white sm:px-10`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href="/staff"
            className="inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold text-white whitespace-nowrap hover:bg-white/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="mt-6">
            <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
            <p className={`mt-2 text-base md:text-lg ${SUBTITLE_CLASSES[gradient]}`}>{description}</p>
          </div>
        </div>
        {/* User information first (name + role), then avatar */}
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          {user && (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight text-white">{displayName}</p>
                <p className={`text-xs leading-tight ${gradient === 'settings' ? 'text-white/80' : 'text-indigo-100'}`}>
                  {roleLabel}
                </p>
              </div>
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
                {initials}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
