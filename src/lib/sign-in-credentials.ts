/** Shared limits for sign-in credential fields (client + server). */

export const SIGN_IN_EMAIL_MAX_LENGTH = 254
export const SIGN_IN_PASSWORD_MAX_LENGTH = 128
export const SIGN_IN_PASSWORD_MIN_LENGTH = 3

const CONTROL_CHARS = /[\x00-\x1F\x7F]/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isSignInSubmitEnabled(
  email: string,
  password: string,
): boolean {
  const trimmed = email.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= SIGN_IN_EMAIL_MAX_LENGTH &&
    password.length >= SIGN_IN_PASSWORD_MIN_LENGTH &&
    password.length <= SIGN_IN_PASSWORD_MAX_LENGTH &&
    !CONTROL_CHARS.test(trimmed) &&
    !CONTROL_CHARS.test(password)
  )
}

/** Server-side gate before credential lookup. */
export function validateSignInCredentials(
  email: string,
  password: string,
): boolean {
  const trimmed = email.trim()
  if (!isSignInSubmitEnabled(trimmed, password)) return false
  if (!EMAIL_PATTERN.test(trimmed)) return false
  return true
}
