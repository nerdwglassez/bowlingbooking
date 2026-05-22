// env.ts — Single source of truth for environment-derived runtime behavior.
//
// All env checks live here. Other modules MUST NOT inline
// `process.env.X` checks for the conditions exposed below.
//
// Why this exists: as of Phase 5 we had four sites checking the same dev-
// without-DATABASE_URL condition. Drift was inevitable. Future env-driven
// branches (feature flags, multi-tenant routing modes, staging guards) go
// here too.

const REAL_DB_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i

/**
 * True only when running in dev/test (NODE_ENV !== 'production') AND
 * DATABASE_URL is missing or a non-URL placeholder. In this mode, callers
 * that would normally hit Prisma return mock data so the UI renders for
 * design work without a provisioned database.
 *
 * Production always returns false: deployments must have a real DATABASE_URL.
 */
export function isDevWithoutDb(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  // Bracket access avoids Turbopack statically inlining a stale/missing value.
  const url = process.env['DATABASE_URL']?.trim()
  if (!url) return true
  return !REAL_DB_URL_PATTERN.test(url)
}

const warnedOnce = new Set<string>()

/**
 * Emit a console.warn with the given key/message only the first time it's
 * called. Subsequent calls with the same key are silent. Use this for
 * once-per-process notices (missing env vars, fallback paths) so dev logs
 * stay readable instead of repeating the same warning on every render.
 */
export function warnOnce(key: string, message: string): void {
  if (warnedOnce.has(key)) return
  warnedOnce.add(key)
  console.warn(message)
}
