'use client'

import { startTransition as defaultStartTransition } from 'react'

/**
 * After `await`ing a server action, React drops the surrounding transition
 * context. `router.refresh()` then suspends as a synchronous update and
 * surfaces minified React error 441 in production.
 *
 * Always call this (or another `startTransition`) around post-await refresh.
 */
export function refreshAfterAction(refresh: () => void): void {
  defaultStartTransition(() => {
    refresh()
  })
}

type TransitionStarter = (scope: () => void) => void

export type RunStaffActionOptions<T> = {
  /** Server action (or any thenable). Invoked synchronously inside a transition. */
  action: () => Promise<T>
  onSuccess?: (result: T) => void
  onError?: (error: unknown) => void
  /**
   * RSC refresh after success. Prefer `() => router.refresh()`.
   * Omit only when navigation (`router.push`) replaces the need to refresh.
   */
  refresh?: () => void
  /**
   * Pass the `startTransition` from `useTransition()` when the UI needs
   * that hook's `isPending` flag. Defaults to React's `startTransition`.
   */
  startTransition?: TransitionStarter
}

/**
 * Canonical staff/admin mutation helper.
 *
 * Starts a transition, invokes the action as a thenable (no `async`
 * transition callback), runs success/error UI in `.then` / `.catch`, then
 * wraps `router.refresh()` in a fresh `startTransition` so error 441 cannot fire
 * from either the manual refresh or a dropped outer transition.
 */
export function runStaffAction<T>(options: RunStaffActionOptions<T>): void {
  const {
    action,
    onSuccess,
    onError,
    refresh,
    startTransition: begin = defaultStartTransition,
  } = options
  begin(() => {
    void action()
      .then((result) => {
        onSuccess?.(result)
        if (refresh) refreshAfterAction(refresh)
      })
      .catch((error: unknown) => {
        onError?.(error)
      })
  })
}
