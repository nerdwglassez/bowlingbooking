/** Shared rules for set-password surfaces (reset + invite). */

export const RESET_PASSWORD_MIN_LENGTH = 8
export const RESET_PASSWORD_MAX_LENGTH = 128

const SPECIAL_CHARACTER = /[^A-Za-z0-9]/

export function passwordHasMinLength(password: string): boolean {
  return password.length >= RESET_PASSWORD_MIN_LENGTH
}

export function passwordHasSpecialCharacter(password: string): boolean {
  return SPECIAL_CHARACTER.test(password)
}

export function isResetPasswordValid(password: string): boolean {
  return (
    password.length <= RESET_PASSWORD_MAX_LENGTH &&
    passwordHasMinLength(password) &&
    passwordHasSpecialCharacter(password)
  )
}

export function resetPasswordError(password: string): string | null {
  if (!passwordHasMinLength(password)) {
    return 'Password must be at least 8 characters.'
  }
  if (!passwordHasSpecialCharacter(password)) {
    return 'Password must contain one special character.'
  }
  if (password.length > RESET_PASSWORD_MAX_LENGTH) {
    return 'Password is too long.'
  }
  return null
}
