// Next.js instrumentation entry point. Runs once per process before any
// request handling. We use it to:
//   1. Load the Sentry server config (and edge config in the edge runtime).
//   2. Re-export `onRequestError` so Sentry sees errors from Server
//      Components, route handlers, and proxy.ts.
//
// The wrapper in `src/lib/observability.ts` is for application code; this
// file is reserved for SDK bootstrapping.

import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
