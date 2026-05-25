// env.ts — Single source of truth for environment-derived runtime behavior.

import type { RateLimitBucket } from '@/lib/rate-limit'
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
export function hasDatabaseUrl(): boolean {
  const url = process.env['DATABASE_URL']?.trim()
  return !!url && REAL_DB_URL_PATTERN.test(url)
}

export function isDevWithoutDb(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return !hasDatabaseUrl()
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

const RATE_LIMIT_DEFAULTS: Record<
  RateLimitBucket,
  { max: number; windowSec: number }
> = {
  find_booking: { max: 30, windowSec: 60 },
  booking_ics: { max: 20, windowSec: 60 },
  promo_validate: { max: 40, windowSec: 60 },
}

const RATE_LIMIT_ENV_MAX: Record<RateLimitBucket, string> = {
  find_booking: 'RATE_LIMIT_FIND_BOOKING_MAX',
  booking_ics: 'RATE_LIMIT_BOOKING_ICS_MAX',
  promo_validate: 'RATE_LIMIT_PROMO_VALIDATE_MAX',
}

/**
 * In-app rate limits for public lookup surfaces. Off in test; on in production
 * unless RATE_LIMIT_ENABLED=false. In dev, set RATE_LIMIT_ENABLED=true to exercise.
 */
export function isRateLimitEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return false
  const flag = process.env['RATE_LIMIT_ENABLED']?.trim().toLowerCase()
  if (flag === 'true') return true
  if (flag === 'false') return false
  return process.env.NODE_ENV === 'production'
}

export function getRateLimitPolicy(bucket: RateLimitBucket): {
  max: number
  windowMs: number
} {
  const defaults = RATE_LIMIT_DEFAULTS[bucket]
  const envKey = RATE_LIMIT_ENV_MAX[bucket]
  const rawMax = process.env[envKey]?.trim()
  const max = rawMax ? Number.parseInt(rawMax, 10) : defaults.max
  const windowSec = Number.parseInt(
    process.env['RATE_LIMIT_WINDOW_SEC']?.trim() ?? '',
    10,
  )
  return {
    max: Number.isFinite(max) && max > 0 ? max : defaults.max,
    windowMs:
      (Number.isFinite(windowSec) && windowSec > 0
        ? windowSec
        : defaults.windowSec) * 1000,
  }
}

/**
 * Sentry performance trace sample rate. Always 0 outside production.
 * Production default 0.1 when SENTRY_TRACES_SAMPLE_RATE is unset.
 */
export function getSentryTracesSampleRate(): number {
  if (process.env.NODE_ENV !== 'production') return 0
  const raw = process.env['SENTRY_TRACES_SAMPLE_RATE']?.trim()
  if (!raw) return 0.1
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n) || n < 0 || n > 1) return 0.1
  return n
}
