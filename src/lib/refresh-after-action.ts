'use client'

import { startTransition } from 'react'

/**
 * After `await`ing a server action, React drops the surrounding transition
 * context. `router.refresh()` then suspends as a synchronous update and
 * surfaces minified React error #441 in production.
 *
 * Always call this (or another `startTransition`) around post-await refresh.
 */
export function refreshAfterAction(refresh: () => void): void {
  startTransition(() => {
    refresh()
  })
}
