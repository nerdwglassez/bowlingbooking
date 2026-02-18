import { randomBytes } from 'crypto'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0,O,1,I
const LEN = 8

/**
 * Generate a short, URL-safe check-in token for kiosk/QR.
 * Caller must ensure uniqueness (e.g. create booking with this token and catch unique violation).
 */
export function generateCheckInToken(): string {
  const bytes = randomBytes(LEN)
  let s = ''
  for (let i = 0; i < LEN; i++) {
    s += CHARS[bytes[i]! % CHARS.length]
  }
  return s
}

/**
 * Generate a unique check-in token by checking DB. Tries up to 5 times.
 */
export async function generateUniqueCheckInToken(
  exists: (token: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateCheckInToken()
    const taken = await exists(token)
    if (!taken) return token
  }
  throw new Error('Could not generate unique check-in token')
}
