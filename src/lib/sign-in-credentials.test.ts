import { describe, expect, it } from 'vitest'

import {
  isSignInSubmitEnabled,
  SIGN_IN_PASSWORD_MIN_LENGTH,
  validateSignInCredentials,
} from './sign-in-credentials'

describe('isSignInSubmitEnabled', () => {
  it('requires email and minimum password length', () => {
    expect(isSignInSubmitEnabled('', '')).toBe(false)
    expect(isSignInSubmitEnabled('a@b.co', 'ab')).toBe(false)
    expect(
      isSignInSubmitEnabled('a@b.co', 'a'.repeat(SIGN_IN_PASSWORD_MIN_LENGTH)),
    ).toBe(true)
  })

  it('rejects control characters', () => {
    expect(isSignInSubmitEnabled('a@b.co', 'abc\x07')).toBe(false)
  })
})

describe('validateSignInCredentials', () => {
  it('requires a plausible email', () => {
    expect(validateSignInCredentials('not-an-email', 'password')).toBe(false)
    expect(validateSignInCredentials('user@example.com', 'password')).toBe(true)
  })
})
