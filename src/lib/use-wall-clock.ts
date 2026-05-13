'use client'

// use-wall-clock.ts — Shared 1-second wall-clock subscription.
//
// React 19's `react-hooks/purity` rule rejects `Date.now()` inside render.
// Components that need a current-millisecond value to derive UI state (e.g.
// "is this hold still valid?") must subscribe to a tick source via
// useSyncExternalStore.
//
// Multiple call sites previously inlined this same store, resulting in N
// independent 1-second intervals running concurrently. This module exposes
// ONE shared interval; all subscribers share it. The interval is created
// lazily on the first subscription and torn down when the last subscriber
// unsubscribes.

import { useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
let interval: ReturnType<typeof setInterval> | null = null
let cachedNow = 0

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (interval == null) {
    cachedNow = Date.now()
    interval = setInterval(() => {
      cachedNow = Date.now()
      for (const l of listeners) l()
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && interval != null) {
      clearInterval(interval)
      interval = null
    }
  }
}

function getSnapshot(): number {
  return cachedNow
}

function getServerSnapshot(): number {
  return 0
}

/**
 * Subscribe to wall-clock time. Re-renders the caller once per second.
 * Returns the current `Date.now()` value.
 *
 * For SSR, returns 0 on the server snapshot so hydration matches; the client
 * picks up the real value on its first effect tick. If your derived state
 * (e.g. "isExpired") would flip during that first tick, accept the one-frame
 * delay — it's harmless for booking-flow timers.
 */
export function useWallClockNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
