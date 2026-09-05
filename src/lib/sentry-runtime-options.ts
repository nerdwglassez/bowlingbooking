// Shared Sentry.init fields for client / server / edge. No @sentry/nextjs
// import — keep the drift chokepoint intact.

import {
  getSentryStaffTracesSampleRate,
  getSentryTracesSampleRate,
} from '@/lib/env'
import {
  applyObservabilityTags,
  isStaffObservabilityName,
} from '@/lib/observability-surface'

export function sentryTracesSampler(ctx: {
  name: string
  inheritOrSampleWith: (fallbackRate: number) => number
}): number {
  if (isStaffObservabilityName(ctx.name)) {
    return getSentryStaffTracesSampleRate()
  }
  return ctx.inheritOrSampleWith(getSentryTracesSampleRate())
}

export function getSentrySharedInitOptions(dsn: string | undefined) {
  return {
    dsn,
    environment: process.env.NODE_ENV,
    enabled: Boolean(dsn),
    sendDefaultPii: false as const,
    tracesSampler: sentryTracesSampler,
    beforeSend: applyObservabilityTags,
    beforeSendTransaction: applyObservabilityTags,
  }
}
