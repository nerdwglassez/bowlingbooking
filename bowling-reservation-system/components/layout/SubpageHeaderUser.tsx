'use client'

import { useEffect, useMemo, useState } from 'react'

type MeResponse = {
  user?: {
    email?: string
    firstName?: string | null
    lastName?: string | null
    role?: string
  }
}

export default function SubpageHeaderUser() {
  const [me, setMe] = useState<MeResponse['user']>()

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!response.ok) return
        const data = (await response.json()) as MeResponse
        setMe(data.user)
      } catch {
        // Intentionally ignore; keep header lightweight.
      }
    }

    load()
  }, [])

  const displayName = useMemo(() => {
    const first = me?.firstName?.trim()
    const last = me?.lastName?.trim()
    const full = [first, last].filter(Boolean).join(' ').trim()
    return full || me?.email || 'Employee'
  }, [me])

  const roleLabel = useMemo(() => {
    const role = me?.role
    if (!role) return 'Staff'
    return role.charAt(0) + role.slice(1).toLowerCase()
  }, [me])

  const initials = useMemo(() => {
    const firstInitial = me?.firstName?.[0] ?? ''
    const lastInitial = me?.lastName?.[0] ?? ''
    const byName = `${firstInitial}${lastInitial}`.toUpperCase()
    if (byName) return byName
    const fallback = me?.email?.slice(0, 2).toUpperCase()
    return fallback || 'ST'
  }, [me])

  return (
    <div className="inline-flex items-center gap-3 text-white">
      <div className="text-right">
        <p className="text-sm font-semibold leading-5">{displayName}</p>
        <p className="text-xs text-indigo-100">{roleLabel}</p>
      </div>
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-bold">
        {initials}
      </div>
    </div>
  )
}
