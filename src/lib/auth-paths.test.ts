import { describe, expect, it } from 'vitest'

import {
  defaultAppPathForRole,
  isGenericSignInFrom,
  resolvePostSignInPath,
  sanitizeSignInFrom,
  signInPathForPath,
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

  it('defaults customers to find-my-booking', () => {
    expect(defaultAppPathForRole('CUSTOMER')).toBe('/find-my-booking')
  })

  it('builds a sanitized sign-in URL for the current path', () => {
    expect(signInPathForPath('/book/confirm')).toBe(
      '/signin?from=%2Fbook%2Fconfirm',
    )
    expect(signInPathForPath('//evil.com')).toBe('/signin?from=%2F')
  })
})
