import { createHash, randomBytes } from 'node:crypto'

export const TOKEN_BYTES = 32

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateRawToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex')
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
    .trim()
    .replace(/\/$/, '')
}
