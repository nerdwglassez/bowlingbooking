import { describe, expect, it } from 'vitest'

import {
  isSerializableConflict,
  isUniqueConstraintOnField,
  isUniqueConstraintViolation,
} from './prisma-errors'

describe('prisma-errors', () => {
  it('detects P2002 and P2034', () => {
    expect(isUniqueConstraintViolation({ code: 'P2002' })).toBe(true)
    expect(isSerializableConflict({ code: 'P2034' })).toBe(true)
    expect(isUniqueConstraintViolation({ code: 'P2034' })).toBe(false)
  })

  it('narrows P2002 by meta.target field names', () => {
    const err = {
      code: 'P2002',
      meta: { target: ['confirmation_code'] },
    }
    expect(isUniqueConstraintOnField(err, ['confirmation_code'])).toBe(true)
    expect(isUniqueConstraintOnField(err, ['stripe_payment_intent_id'])).toBe(
      false,
    )
  })
})
