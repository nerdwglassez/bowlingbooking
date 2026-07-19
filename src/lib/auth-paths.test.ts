import { describe, expect, it } from 'vitest'

import {
  bookingSignInPath,
  defaultAppPathForRole,
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

  it('treats booking header from=/staff as generic for admins', () => {
    expect(isGenericSignInFrom('/staff')).toBe(true)
    expect(resolvePostSignInPath('/staff', 'ADMIN')).toBe('/staff')
    expect(resolvePostSignInPath('/staff', 'STAFF')).toBe('/staff')
  })

  it('builds sign-in links that preserve the current booking step', () => {
    expect(bookingSignInPath('/book')).toBe('/signin?from=/book')
    expect(bookingSignInPath('/book/package')).toBe(
      '/signin?from=/book/package',
    )
    expect(bookingSignInPath('/book/details')).toBe(
      '/signin?from=/book/details',
    )
    expect(bookingSignInPath('/book/confirm')).toBe(
      '/signin?from=/book/confirm',
    )
  })

  it('does not build booking sign-in links from unsafe paths', () => {
    expect(bookingSignInPath('//evil.com')).toBe('/signin?from=/book')
  })

  it('defaults customers to find-my-booking', () => {
    expect(defaultAppPathForRole('CUSTOMER')).toBe('/find-my-booking')
  })
})
