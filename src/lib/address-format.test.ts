import { describe, expect, it } from 'vitest'

import {
  formatTenantAddress,
  parseTenantAddress,
} from '@/lib/address-format'

describe('address-format', () => {
  it('parses a standard US address', () => {
    expect(
      parseTenantAddress('8512 Two Notch Rd, Columbia, SC 29223'),
    ).toEqual({
      street: '8512 Two Notch Rd',
      city: 'Columbia',
      state: 'SC',
      zip: '29223',
    })
  })

  it('round-trips formatted addresses', () => {
    const formatted = formatTenantAddress({
      street: '8512 Two Notch Rd',
      city: 'Columbia',
      state: 'SC',
      zip: '29223',
    })
    expect(formatted).toBe('8512 Two Notch Rd, Columbia, SC 29223')
    expect(parseTenantAddress(formatted)).toEqual({
      street: '8512 Two Notch Rd',
      city: 'Columbia',
      state: 'SC',
      zip: '29223',
    })
  })
})
