'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthModal from './AuthModal'
import { VENUE_NAME, VENUE_ADDRESS } from '@/lib/venue'

export default function BookingHeader() {
  const router = useRouter()
  const [authOpen, setAuthOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const dashboardHref = userRole === 'STAFF' || userRole === 'MANAGER' || userRole === 'ADMIN' ? '/staff' : '/dashboard'

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) return res.json()
        throw new Error('Not authenticated')
      })
      .then(data => {
        setIsAuthenticated(true)
        setUserRole(data.user?.role ?? null)
      })
      .catch(() => {
        setIsAuthenticated(false)
        setUserRole(null)
      })
  }, [authOpen])

  const handleAuthSuccess = () => {
    setAuthOpen(false)
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setIsAuthenticated(true)
        const role = data.user?.role
        setUserRole(role)
        if (role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN') {
          router.push('/staff')
        }
      })
      .catch(() => {})
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex min-h-[4rem] max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold leading-tight text-gray-900">{VENUE_NAME}</span>
            <span className="text-xs leading-tight text-gray-500">{VENUE_ADDRESS}</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated === true ? (
              <Link
                href={dashboardHref}
                className="text-sm font-medium text-[#1A237E] hover:text-[#283593]"
              >
                My Bookings
              </Link>
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
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  )
}
