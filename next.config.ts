import type { NextConfig } from 'next'

import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  // Keep Prisma on the Node runtime with real process.env (not a bundled stub).
  serverExternalPackages: ['prisma', '@prisma/adapter-pg', 'pg'],
}

// Sentry build-time config. When SENTRY_AUTH_TOKEN is unset (dev / preview),
// withSentryConfig still works — it just skips source-map upload. Production
// CI should set SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Do NOT tunnel via /sentry-tunnel: would require updating proxy.ts matcher
  // and adds load. Default is direct-to-Sentry, which is fine.
})
