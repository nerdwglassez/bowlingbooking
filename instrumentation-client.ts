// Sentry client-side SDK initialization.
//
// Auto-loaded by Next.js for App Router clients. The wrapper in
// `src/lib/observability.ts` is what application code should import.
//
// Tracing + Web Vitals (LCP / INP / CLS) are on. Session Replay stays off
// until a privacy review — staff screens show customer PII.

import * as Sentry from '@sentry/nextjs'

import { isStaffObservabilityName } from '@/lib/observability-surface'
import { getSentrySharedInitOptions } from '@/lib/sentry-runtime-options'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  ...getSentrySharedInitOptions(dsn),
  integrations: [
    Sentry.browserTracingIntegration({
      enableInp: true,
      enableLongTask: true,
      enableLongAnimationFrame: true,
      beforeStartSpan: (context) => {
        const name = context.name ?? ''
        if (!isStaffObservabilityName(name)) return context
        return {
          ...context,
          attributes: {
            ...context.attributes,
            app: 'staff',
            surface: 'staff',
          },
        }
      },
    }),
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
