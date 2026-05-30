'use client'

import { useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useToast } from '@/app/(customer)/book/toast-provider'

const SESSION_EXPIRED_MESSAGE =
  'Your session expired. Please select a new time.'

/**
 * Shared hold-expiry handler for booking steps 1–4.
 * Clears the hold in context, shows the session-expired toast, and
 * redirects to Step 1 when the customer is on a downstream step.
 */
export function useHoldExpiry(clearHold: () => void) {
  const router = useRouter()
  const pathname = usePathname()
  const { showToast } = useToast()

  return useCallback(() => {
    clearHold()
    showToast({
      message: SESSION_EXPIRED_MESSAGE,
      variant: 'error',
      durationMs: 5000,
      dismissible: true,
    })
    if (pathname !== '/book') {
      router.push('/book')
    }
  }, [clearHold, pathname, router, showToast])
}
