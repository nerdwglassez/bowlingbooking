/** Detect Next.js `redirect()` throw inside route handlers / server utilities. */
export function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { message?: string; digest?: string }
  return Boolean(
    e.message?.includes('redirect') ||
      e.message?.includes('NEXT_REDIRECT') ||
      e.digest?.includes('NEXT_REDIRECT')
  )
}
