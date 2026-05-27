/**
 * Helpers for Next.js navigation signals that surface as thrown errors with a
 * `digest` string (redirect, not-found, unauthorized).
 */

export function redirectUrlFromDigest(digest: string | undefined): string | null {
  if (!digest?.startsWith('NEXT_REDIRECT;')) return null
  const parts = digest.split(';')
  // NEXT_REDIRECT;replace;/signin?from=/admin;307;
  const url = parts[2]
  return url && url.startsWith('/') && !url.startsWith('//') ? url : null
}

export function isNextRouterDigest(digest: string | undefined): boolean {
  if (!digest) return false
  return (
    digest.startsWith('NEXT_REDIRECT;') ||
    digest.startsWith('NEXT_NOT_FOUND') ||
    digest.includes('NEXT_HTTP_ERROR_FALLBACK')
  )
}
