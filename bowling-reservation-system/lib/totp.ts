import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

const ISSUER = process.env.TOTP_ISSUER ?? 'Bowling Alley'

export interface TotpSetup {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

/**
 * Generate a new TOTP secret and return secret, otpauth URL, and QR code as data URL.
 */
export async function generateTotpSecret(email: string): Promise<TotpSetup> {
  const secret = speakeasy.generateSecret({
    name: `${ISSUER} (${email})`,
    issuer: ISSUER,
    length: 20,
  })

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate TOTP secret')
  }

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url, {
    width: 200,
    margin: 2,
  })

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCodeDataUrl,
  }
}

/**
 * Verify a TOTP code against a base32 secret. Allows one step (30s) window on either side.
 */
export function verifyTotpToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  })
}
