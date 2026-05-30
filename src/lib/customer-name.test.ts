import { describe, expect, it } from 'vitest'

import {
  isContactComplete,
  joinCustomerName,
  splitCustomerName,
} from '@/lib/customer-name'

describe('customer-name', () => {
  it('splits and joins full names', () => {
    expect(splitCustomerName('Sarah Johnson')).toEqual({
      firstName: 'Sarah',
      lastName: 'Johnson',
    })
    expect(joinCustomerName('Sarah', 'Johnson')).toBe('Sarah Johnson')
  })

  it('requires first and last name plus valid email', () => {
    expect(isContactComplete('Sarah Johnson', 'sarah@email.com')).toBe(true)
    expect(isContactComplete('Sarah', 'sarah@email.com')).toBe(false)
    expect(isContactComplete('Sarah Johnson', 'bad')).toBe(false)
  })
})
