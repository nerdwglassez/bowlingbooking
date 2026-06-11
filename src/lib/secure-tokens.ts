import { createHash, randomBytes } from 'node:crypto'

import { resolveAppBaseUrl } from '@/lib/env'

export const TOKEN_BYTES = 32

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

export function appBaseUrl(): string {
  return resolveAppBaseUrl()
}
