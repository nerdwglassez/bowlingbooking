// Sentry edge-runtime SDK initialization.
//
// Loaded from `instrumentation.ts` when NEXT_RUNTIME === 'edge'. As of Phase 11
// the only edge-runtime code is `src/proxy.ts`. If that ever ports back to
// node-runtime, this file can be removed.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  sendDefaultPii: false,
})
