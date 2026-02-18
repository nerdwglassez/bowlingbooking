import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './db'
import { checkRateLimit, rateLimitKey } from './rate-limit'

const API_KEY_PREFIX = 'bowl_'
const PREFIX_LENGTH = 12 // chars to store for lookup

export interface ApiKeyRecord {
  id: string
  name: string
  scopes: string[]
  rateLimitPerMinute: number
}

function hashKey(key: string): string {
  return createHash('sha256').update(key.trim()).digest('hex')
}

function getPrefix(key: string): string {
  return key.trim().slice(0, PREFIX_LENGTH)
}

/**
 * Validate X-API-Key header and return the API key record if valid.
 * Returns null if missing or invalid.
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyRecord | null> {
  const raw = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!raw || !raw.startsWith(API_KEY_PREFIX)) return null

  const preLookupLimit = checkRateLimit(rateLimitKey(request, 'api-key-prelookup', raw.slice(0, PREFIX_LENGTH)), 120, 60_000)
  if (!preLookupLimit.allowed) return null

  const prefix = getPrefix(raw)
  const keyHash = hashKey(raw)

  const key = await prisma.apiKey.findUnique({
    where: { keyPrefix: prefix },
  })
  if (!key) return null

  const keyHashBuffer = Buffer.from(keyHash, 'hex')
  const providedBuffer = Buffer.from(key.keyHash, 'hex')
  if (keyHashBuffer.length !== providedBuffer.length || !timingSafeEqual(keyHashBuffer, providedBuffer)) {
    return null
  }

  const perKeyLimit = checkRateLimit(
    rateLimitKey(request, 'api-key', key.id),
    key.rateLimitPerMinute,
    60_000
  )
  if (!perKeyLimit.allowed) return null

  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return {
    id: key.id,
    name: key.name,
    scopes: key.scopes.split(',').map((s) => s.trim()).filter(Boolean),
    rateLimitPerMinute: key.rateLimitPerMinute,
  }
}

export function requireScope(record: ApiKeyRecord, scope: string): boolean {
  return record.scopes.includes(scope) || record.scopes.includes('*')
}

/**
 * Respond with 401 JSON for missing/invalid API key.
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message: 'Valid X-API-Key or Bearer token required' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  )
}

/**
 * Respond with 403 JSON for insufficient scope.
 */
export function forbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden', message: 'API key does not have permission for this action' },
    { status: 403 }
  )
}

/**
 * Generate a new API key (plain) and return it with the prefix for storage.
 * Caller must store keyHash and keyPrefix in DB; show plain key to user once.
 */
export function generateApiKey(): { plainKey: string; keyPrefix: string; keyHash: string } {
  const randomPart = randomBytes(24).toString('hex')
  const plainKey = `${API_KEY_PREFIX}${randomPart}`
  return {
    plainKey,
    keyPrefix: getPrefix(plainKey),
    keyHash: hashKey(plainKey),
  }
}
