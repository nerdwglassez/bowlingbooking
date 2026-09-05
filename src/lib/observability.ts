// observability.ts — single entry point for error monitoring.
//
// Other modules MUST NOT `import '@sentry/nextjs'` directly. The drift sentinel
// enforces this. Exceptions: the three Sentry SDK config files at the project
// root (`sentry.server.config.ts`, `sentry.edge.config.ts`,
// `instrumentation-client.ts`), the `instrumentation.ts` registrar, and
// `app/global-error.tsx`. Those files initialize the SDK; everything else
// reports through this module.
//
// Dev-without-DSN: when neither `NEXT_PUBLIC_SENTRY_DSN` nor `SENTRY_DSN` is
// set, every export becomes a console-logging no-op. Production with no DSN
// emits a one-shot warning so the gap is visible in logs but does NOT crash.
//
// Why a wrapper at all:
//   - One chokepoint for tagging context (tenantId, userId, action name) so
//     we don't sprinkle Sentry calls across server actions.
//   - One place to swap providers later (Datadog, GlitchTip, etc.) without
//     touching the rest of the codebase.
//   - Drift-rule-enforceable: the same pattern as stripe.ts / email.ts.

import * as Sentry from '@sentry/nextjs'

import { warnOnce } from '@/lib/env'
import type { ObservabilitySurface } from '@/lib/observability-surface'

function isSentryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
      process.env.SENTRY_DSN?.trim(),
  )
}

function warnIfMissing(): void {
  if (isSentryConfigured()) return
  if (process.env.NODE_ENV === 'production') {
    warnOnce(
      'sentry-dsn',
      'NEXT_PUBLIC_SENTRY_DSN is not set in production — error monitoring is OFF. ' +
        'See docs/RUNBOOK.md for setup.',
    )
  }
}

export interface ErrorContext {
  /** Tenant slug or id when known. Lets us slice by tenant in Sentry. */
  tenantId?: string
  /** User id when known. Sentry user.id field. */
  userId?: string
  /** Server-action / route name. Becomes the transaction name when tagged. */
  action?: string
  /** Arbitrary extra context. Avoid PII; Sentry default scrubs many fields. */
  extra?: Record<string, unknown>
  /** Tags become searchable filters in Sentry's UI. */
  tags?: Record<string, string>
}

/**
 * Report a caught exception to Sentry with optional context.
 *
 * In dev-without-DSN mode this logs to the console so developers can still
 * see the captured error during exploration.
 */
export function captureException(error: unknown, ctx: ErrorContext = {}): void {
  warnIfMissing()
  if (!isSentryConfigured()) {
    console.error('[observability]', ctx.action ?? '(unknown)', error, ctx)
    return
  }
  Sentry.withScope((scope) => {
    if (ctx.tenantId) scope.setTag('tenantId', ctx.tenantId)
    if (ctx.userId) scope.setUser({ id: ctx.userId })
    if (ctx.action) scope.setTransactionName(ctx.action)
    if (ctx.tags) {
      for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v)
    }
    if (ctx.extra) {
      for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v)
    }
    Sentry.captureException(error)
  })
}

/**
 * Report a non-error event (informational or warning). Use sparingly —
 * Sentry's value is in errors. For high-volume audit-style logging, use the
 * AuditLog table.
 */
export function captureMessage(
  message: string,
  ctx: ErrorContext & {
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  } = {},
): void {
  warnIfMissing()
  if (!isSentryConfigured()) {
    console.log('[observability:msg]', ctx.action ?? '(unknown)', message, ctx)
    return
  }
  Sentry.withScope((scope) => {
    if (ctx.tenantId) scope.setTag('tenantId', ctx.tenantId)
    if (ctx.userId) scope.setUser({ id: ctx.userId })
    if (ctx.tags) {
      for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v)
    }
    if (ctx.extra) {
      for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v)
    }
    Sentry.captureMessage(message, ctx.level ?? 'info')
  })
}

/**
 * Wrap an async function with observability: any thrown error is captured
 * (and re-thrown so existing error-handling paths still run). Use for the
 * outermost layer of a server action.
 *
 *   export const myAction = withObservability(
 *     'myAction',
 *     async (input) => { ... },
 *   )
 *
 * For tenant/user tagging, capture inside the body and call
 * `captureException(err, { tenantId, userId })` directly — the HOF doesn't
 * have access to those values.
 */
export function withObservability<TArgs extends unknown[], TReturn>(
  actionName: string,
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async function observed(...args: TArgs): Promise<TReturn> {
    try {
      return await fn(...args)
    } catch (err) {
      captureException(err, { action: actionName })
      throw err
    }
  }
}

/** Tag the current scope so staff Insights filters (`app:staff`) work. */
export function setObservabilitySurface(
  surface: ObservabilitySurface,
  route?: string,
): void {
  if (!isSentryConfigured()) return
  const scope = Sentry.getCurrentScope()
  scope.setTag('app', surface)
  scope.setTag('surface', surface)
  if (route) scope.setTag('staff.route', route)
}

/**
 * Root span for a staff page load (cockpit first). Becomes a searchable
 * transaction named e.g. `staff.cockpit.load`.
 */
export async function withStaffPageSpan<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isSentryConfigured()) return fn()
  return Sentry.startSpan(
    {
      name,
      op: 'ui.load',
      forceTransaction: true,
      attributes: { app: 'staff', surface: 'staff' },
    },
    async () => {
      setObservabilitySurface('staff')
      return fn()
    },
  )
}
