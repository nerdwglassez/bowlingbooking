'use client'

import { usePathname } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'

import { setObservabilitySurface } from '@/lib/observability'
import { observabilitySurfaceFromPath } from '@/lib/observability-surface'

/**
 * Stamps Sentry app/surface tags on the client scope for employee routes
 * so Web Vitals and pageloads can be filtered to the staff dashboard.
 */
export function StaffObservabilityScope({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'

  useEffect(() => {
    setObservabilitySurface(observabilitySurfaceFromPath(pathname), pathname)
  }, [pathname])

  return children
}
