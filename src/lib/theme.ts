// theme.ts — Server-side theme resolution.
//
// Theme is decided server-side from (1) the URL pathname and (2) a `theme`
// cookie. The root layout stamps `data-theme` on `<html>` during SSR.
//
// Rules:
//   - Customer paths are always light (amber brand until /book is redesigned).
//   - /staff/* and /admin/* follow the `theme` cookie written by
//     StaffThemeScope from the device color scheme. No cookie → light.
//   - /signin uses light theme + staff brand (Untitled purple) so the split
//     login matches Figma without following the employee device scheme.
//   - CSS never uses prefers-color-scheme. Untitled `dark:` maps to
//     [data-theme="dark"]. Staff also sets data-app="staff" so light staff
//     uses stock Untitled purple, not customer amber.
//
// NEVER use Tailwind's `dark:` against prefers-color-scheme.
// NEVER read `localStorage` for theme; cookies survive SSR.

import { cookies, headers } from 'next/headers'

export type Theme = 'light' | 'dark'

const COOKIE_NAME = 'theme'
const STAFF_APP_PATTERNS = [/^\/staff(\/|$)/, /^\/admin(\/|$)/]
const STAFF_BRAND_PATTERNS = [
  ...STAFF_APP_PATTERNS,
  /^\/signin(\/|$)/,
]

function isStaffAppPath(pathname: string): boolean {
  return STAFF_APP_PATTERNS.some((re) => re.test(pathname))
}

function isStaffBrandPath(pathname: string): boolean {
  return STAFF_BRAND_PATTERNS.some((re) => re.test(pathname))
}

/**
 * Resolve the theme for the current request. Call from server components
 * only (uses async `cookies()` / `headers()`). Returns 'light' or 'dark'.
 */
export async function resolveTheme(): Promise<Theme> {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/'

  if (!isStaffAppPath(pathname)) return 'light'

  const c = await cookies()
  const stored = c.get(COOKIE_NAME)?.value
  if (stored === 'light' || stored === 'dark') return stored
  return 'light'
}

/**
 * Stock Untitled purple (`data-app="staff"`) for employee chrome and the
 * shared `/signin` split login. Customer `/book` stays amber.
 */
export async function resolveStaffBrand(): Promise<boolean> {
  const h = await headers()
  const pathname = h.get('x-pathname') ?? '/'
  return isStaffBrandPath(pathname)
}

/**
 * Persist the staff/admin theme choice (device scheme, written by
 * StaffThemeScope). Customer routes ignore this cookie.
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
