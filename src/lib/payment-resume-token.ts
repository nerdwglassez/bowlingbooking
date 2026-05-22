import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000

function signingSecret(): string {
  const secret =
    process.env['AUTH_SECRET']?.trim() ||
    process.env['NEXTAUTH_SECRET']?.trim()
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required to sign payment resume links')
  }
  return 'dev-only-payment-resume-token'
}

function signPayload(payloadB64: string): string {
  return createHmac('sha256', signingSecret())
    .update(payloadB64)
    .digest('base64url')
}

/**
 * HMAC-signed token embedding a PaymentIntent id. Used for staff-generated
 * customer resume links (M12-M2).
 */
export function signPaymentResumeToken(paymentIntentId: string): string {
  const exp = Date.now() + TOKEN_TTL_MS
  const payloadB64 = Buffer.from(
    JSON.stringify({ pi: paymentIntentId, exp }),
  ).toString('base64url')
  return `${payloadB64}.${signPayload(payloadB64)}`
}

export function verifyPaymentResumeToken(
  token: string,
): { paymentIntentId: string } | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, sig] = parts
  if (!payloadB64 || !sig) return null

  const expected = signPayload(payloadB64)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as { pi?: string; exp?: number }
    if (typeof parsed.pi !== 'string' || !parsed.pi.startsWith('pi_')) {
      return null
    }
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) {
      return null
    }
    return { paymentIntentId: parsed.pi }
  } catch {
    return null
  }
}

export function paymentResumeExpiresAt(): Date {
  return new Date(Date.now() + TOKEN_TTL_MS)
}
