/** Where `/` redirects: customer booking or staff/admin sign-in. */

export type HomeEntry = 'book' | 'staff' | 'admin'

const HOME_PATHS: Record<HomeEntry, string> = {
  book: '/book',
  staff: '/signin?from=/staff',
  admin: '/signin?from=/admin',
}

function parseHomeEntry(raw: string | undefined): HomeEntry | null {
  const v = raw?.trim().toLowerCase()
  if (v === 'book' || v === 'staff' || v === 'admin') return v
  return null
}

/**
 * Redirect target for the root route. `pageOverride` in `src/app/page.tsx`
 * wins over `NEXT_PUBLIC_HOME_ENTRY`; both fall back to `book`.
 */
export function getHomeRedirectPath(pageOverride?: HomeEntry | null): string {
  const entry =
    pageOverride ??
    parseHomeEntry(process.env['NEXT_PUBLIC_HOME_ENTRY']) ??
    'book'
  return HOME_PATHS[entry]
}
