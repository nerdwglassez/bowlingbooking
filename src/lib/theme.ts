// theme.ts — Server-side theme resolution.
//
// Theme is decided entirely server-side from (1) the URL pathname and
// (2) a `theme` cookie. The root layout reads `resolveTheme()` and stamps
// `data-theme` directly on `<html>` during SSR — no client script, no
// hydration warning, no FOUC.
//
// Rules:
//   - /staff/* and /admin/* paths are ALWAYS rendered dark, ignoring cookies.
//   - All other paths default to 'light' unless a `theme` cookie says
//     otherwise. A future customer-facing toggle will call setThemeCookie().
//
// NEVER use Tailwind's `dark:` prefix — it conflicts with this system.
// NEVER read `localStorage` for theme; cookies survive SSR.

import { cookies, headers } from 'next/headers'

export type Theme = 'light' | 'dark'

const COOKIE_NAME = 'theme'
const FORCED_DARK_PATTERNS = [/^\/staff(\/|$)/, /^\/admin(\/|$)/]

function isForcedDarkPath(pathname: string): boolean {
  return FORCED_DARK_PATTERNS.some((re) => re.test(pathname))
}

/**
 * Resolve the theme for the current request. Call from server components
 * only (uses async `cookies()` / `headers()`). Returns 'light' or 'dark'.
 *
 * Note: when proxy doesn't run (e.g. fully static segment) `x-pathname` is
 * absent and we default to '/' → light. That's safe because forced-dark
 * route groups always have proxy coverage.
 */
export async function resolveTheme(): Promise<Theme> {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/'

  if (isForcedDarkPath(pathname)) return 'dark'

  const c = await cookies()
  const stored = c.get(COOKIE_NAME)?.value
  if (stored === 'light' || stored === 'dark') return stored
  return 'light'
}

/**
 * Persist the user's theme choice. Intended to be wrapped in a Server Action
 * by the (future) customer-facing toggle UI. NOT available on staff/admin
 * routes — those are server-forced dark.
 *
 * Caller is responsible for `router.refresh()` after invocation so the new
 * cookie value is picked up.
 */
export async function setThemeCookie(theme: Theme): Promise<void> {
  const c = await cookies()
  c.set(COOKIE_NAME, theme, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
  })
}
