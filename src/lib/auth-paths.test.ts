import { describe, expect, it } from 'vitest'

import {
  CHECKOUT_SIGN_IN_PATH,
  defaultAppPathForRole,
  isBookingSignInFrom,
  isGenericSignInFrom,
  resolvePostSignInPath,
  sanitizeSignInFrom,
} from './auth-paths'

describe('post-sign-in paths', () => {
  it('sanitizes invalid from values to /', () => {
    expect(sanitizeSignInFrom('https://evil.com')).toBe('/')
    expect(sanitizeSignInFrom('/signin')).toBe('/')
    expect(sanitizeSignInFrom('//evil.com')).toBe('/')
    expect(sanitizeSignInFrom('/%2F%2Fevil.com')).toBe('/')
  })

  it('honors explicit from when safe', () => {
    expect(resolvePostSignInPath('/admin/audit', 'STAFF')).toBe('/admin/audit')
  })

  it('never resolves bare / to home (uses role default)', () => {
    expect(resolvePostSignInPath('/', 'ADMIN')).toBe('/staff')
    expect(resolvePostSignInPath('/', 'STAFF')).toBe('/staff')
    expect(defaultAppPathForRole('MANAGER')).toBe('/staff')
  })

  it('treats from=/staff as generic for employees', () => {
    expect(isGenericSignInFrom('/staff')).toBe(true)
    expect(resolvePostSignInPath('/staff', 'ADMIN')).toBe('/staff')
    expect(resolvePostSignInPath('/staff', 'STAFF')).toBe('/staff')
  })

  it('treats checkout sign-in as a booking return path', () => {
    expect(CHECKOUT_SIGN_IN_PATH).toBe('/signin?from=/book/confirm')
    expect(isBookingSignInFrom('/book/confirm')).toBe(true)
    expect(isGenericSignInFrom('/book/confirm')).toBe(false)
  })

  it('defaults customers to find-my-booking', () => {
    expect(defaultAppPathForRole('CUSTOMER')).toBe('/find-my-booking')
  })
})
