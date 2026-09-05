import { describe, expect, it } from 'vitest'

import {
  isResetPasswordValid,
  passwordHasMinLength,
  passwordHasSpecialCharacter,
  resetPasswordError,
} from './password-rules'

describe('password rules', () => {
  it('requires at least 8 characters', () => {
    expect(passwordHasMinLength('Abcd1!')).toBe(false)
    expect(passwordHasMinLength('Abcd12!x')).toBe(true)
  })

  it('requires a special character', () => {
    expect(passwordHasSpecialCharacter('Password1')).toBe(false)
    expect(passwordHasSpecialCharacter('Password!')).toBe(true)
  })

  it('accepts a valid reset password', () => {
    expect(isResetPasswordValid('Password!')).toBe(true)
    expect(resetPasswordError('Password!')).toBeNull()
  })

  it('explains why a password is rejected', () => {
    expect(resetPasswordError('short')).toMatch(/8 characters/)
    expect(resetPasswordError('longenough')).toMatch(/special character/)
  })
})
