import { describe, expect, it } from 'vitest'

import {
  CONFIRMATION_CODE_LENGTH,
  generateConfirmationCode,
} from './booking-codes'

const CHARSET = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/

describe('generateConfirmationCode', () => {
  it('returns the default length', () => {
    expect(generateConfirmationCode()).toHaveLength(CONFIRMATION_CODE_LENGTH)
  })

  it('uses only the readable charset', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateConfirmationCode()).toMatch(CHARSET)
    }
  })

  it('honors a custom length', () => {
    expect(generateConfirmationCode(8)).toHaveLength(8)
  })

  it('produces varying codes', () => {
    const codes = new Set(
      Array.from({ length: 20 }, () => generateConfirmationCode()),
    )
    expect(codes.size).toBeGreaterThan(1)
  })
})
