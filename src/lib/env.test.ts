import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isDevWithoutDb } from './env'

describe('isDevWithoutDb', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns false in production regardless of DATABASE_URL', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', '')
    expect(isDevWithoutDb()).toBe(false)
    vi.stubEnv('DATABASE_URL', 'postgresql://example')
    expect(isDevWithoutDb()).toBe(false)
  })

  it('returns true in dev when DATABASE_URL is missing or blank', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', '')
    expect(isDevWithoutDb()).toBe(true)
    vi.stubEnv('DATABASE_URL', '   ')
    expect(isDevWithoutDb()).toBe(true)
  })

  it('returns true in dev when DATABASE_URL is a non-URL placeholder', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', 'TODO')
    expect(isDevWithoutDb()).toBe(true)
    vi.stubEnv('DATABASE_URL', 'set-me')
    expect(isDevWithoutDb()).toBe(true)
  })

  it('returns false in dev when DATABASE_URL looks like a real connection string', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@host:5432/db')
    expect(isDevWithoutDb()).toBe(false)
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@host/db?sslmode=require')
    expect(isDevWithoutDb()).toBe(false)
    vi.stubEnv('DATABASE_URL', 'mysql://user:pass@host/db')
    expect(isDevWithoutDb()).toBe(false)
  })

  it('treats test mode the same as dev', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATABASE_URL', '')
    expect(isDevWithoutDb()).toBe(true)
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test')
    expect(isDevWithoutDb()).toBe(false)
  })
})
