import { randomInt } from 'node:crypto'

/** Crockford-style alphabet (no 0/O/1/I) for readable confirmation codes. */
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const CONFIRMATION_CODE_LENGTH = 6

/**
 * Cryptographically random booking confirmation code for customer lookup.
 * Uniqueness is enforced in the DB; callers must retry on `confirmation_code` P2002.
 */
export function generateConfirmationCode(
  length: number = CONFIRMATION_CODE_LENGTH,
): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CHARSET[randomInt(CHARSET.length)]!
  }
  return out
}
