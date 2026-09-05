// Sentry server-side SDK initialization.
//
// Loaded from `instrumentation.ts` when NEXT_RUNTIME === 'nodejs'. The wrapper
// in `src/lib/observability.ts` is what application code should import; this
// file is reserved for SDK setup.
//
// When NEXT_PUBLIC_SENTRY_DSN is unset, `Sentry.init` is a no-op — that's the
// dev fallback documented in observability.ts. Production should always set
// the DSN (see docs/RUNBOOK.md §2).

import * as Sentry from '@sentry/nextjs'

import { getSentrySharedInitOptions } from '@/lib/sentry-runtime-options'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

Sentry.init({
  ...getSentrySharedInitOptions(dsn),
})
