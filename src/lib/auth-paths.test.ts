import { describe, expect, it } from 'vitest'

import {
  defaultAppPathForRole,
  isGenericSignInFrom,
  resolvePostSignInPath,
  sanitizeSignInFrom,
} from './auth-paths'

describe('post-sign-in paths', () => {
  it('sanitizes invalid from values to /', () => {
    expect(sanitizeSignInFrom('https://evil.com')).toBe('/')
    expect(sanitizeSignInFrom('//evil.com')).toBe('/')
    expect(sanitizeSignInFrom('/%2F%2Fevil.com')).toBe('/')
    expect(sanitizeSignInFrom('/signin')).toBe('/')
  })

  it('honors explicit from when safe', () => {
    expect(resolvePostSignInPath('/admin/audit', 'STAFF')).toBe('/admin/audit')
  })

  it('never resolves bare / to home (uses role default)', () => {
    expect(resolvePostSignInPath('/', 'ADMIN')).toBe('/admin')
    expect(resolvePostSignInPath('/', 'STAFF')).toBe('/staff')
    expect(defaultAppPathForRole('MANAGER')).toBe('/admin')
  })

  it('treats booking header from=/staff as generic for admins', () => {
    expect(isGenericSignInFrom('/staff')).toBe(true)
    expect(resolvePostSignInPath('/staff', 'ADMIN')).toBe('/admin')
    expect(resolvePostSignInPath('/staff', 'STAFF')).toBe('/staff')
  })

  it('defaults customers to find-my-booking', () => {
    expect(defaultAppPathForRole('CUSTOMER')).toBe('/find-my-booking')
  })
})
