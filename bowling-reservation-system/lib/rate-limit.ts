import { NextRequest } from 'next/server'

/**
 * In-memory limiter: effective per server instance. On serverless with many instances,
 * abusers get more headroom unless you add Redis/Upstash or an edge rate limiter.
 */

type Bucket = {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, Bucket>()

function nowMs(): number {
  return Date.now()
}

function cleanupExpired(): void {
  const now = nowMs()
  for (const [key, bucket] of memoryStore) {
    if (bucket.resetAt <= now) {
      memoryStore.delete(key)
    }
  }
}

export function getClientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    return fwd.split(',')[0]?.trim() || 'unknown'
  }
  const realIp = request.headers.get('x-real-ip')
  return realIp?.trim() || 'unknown'
}

export function rateLimitKey(request: NextRequest, scope: string, subject?: string): string {
  const ip = getClientIp(request)
  return `${scope}:${subject || 'anon'}:${ip}`
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  cleanupExpired()

  const now = nowMs()
  const existing = memoryStore.get(key)
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  memoryStore.set(key, existing)
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}
