import { headers } from 'next/headers'

import { isRateLimitEnabled } from '@/lib/env'
import {
  assertRateLimit,
  getClientIdFromHeaderValues,
  type RateLimitBucket,
} from '@/lib/rate-limit'

/** Rate-limit guard for server actions and route handlers (Node runtime). */
export async function assertPublicRateLimit(
  bucket: RateLimitBucket,
): Promise<void> {
  if (!isRateLimitEnabled()) return

  const h = await headers()
  const clientId = getClientIdFromHeaderValues((name) => h.get(name))
  assertRateLimit(bucket, clientId)
}
