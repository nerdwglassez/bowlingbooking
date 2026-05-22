// Sentry client-side SDK initialization.
//
// Auto-loaded by Next.js for App Router clients. The wrapper in
// `src/lib/observability.ts` is what application code should import.
//
// Session Replay and Tracing are OFF in v1 to keep the SDK payload small.
// Re-enable when we've validated steady-state error volume.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  sendDefaultPii: false,
})
