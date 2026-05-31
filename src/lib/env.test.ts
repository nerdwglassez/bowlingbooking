import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isDevWithoutDb,
  isPrismaConnectivityError,
  shouldUseDevDbFallback,
} from './env'

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

describe('isPrismaConnectivityError', () => {
  it('detects P1001 and unreachable-server messages', () => {
    const p1001 = Object.assign(new Error('Can\'t reach database server'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P1001',
    })
    expect(isPrismaConnectivityError(p1001)).toBe(true)

    const init = Object.assign(new Error('Invalid connection string'), {
      name: 'PrismaClientInitializationError',
    })
    expect(isPrismaConnectivityError(init)).toBe(true)

    expect(
      isPrismaConnectivityError(
        new Error("Can't reach database server at `host:5432`"),
      ),
    ).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isPrismaConnectivityError(new Error('Tenant not found'))).toBe(false)
    expect(isPrismaConnectivityError('string')).toBe(false)
  })
})

describe('shouldUseDevDbFallback', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true in dev when DATABASE_URL is missing', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', '')
    expect(shouldUseDevDbFallback()).toBe(true)
  })

  it('returns true in dev on connectivity errors when DATABASE_URL is set', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@host/db')
    const err = Object.assign(new Error('Can\'t reach database server'), {
      code: 'P1001',
    })
    expect(shouldUseDevDbFallback(err)).toBe(true)
  })

  it('returns false in production even for P1001', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@host/db')
    const err = Object.assign(new Error('Can\'t reach database server'), {
      code: 'P1001',
    })
    expect(shouldUseDevDbFallback(err)).toBe(false)
  })

  it('returns true in dev for interactive transaction timeout (P2028)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DATABASE_URL', 'postgresql://user:pass@host/db')
    const err = Object.assign(
      new Error(
        'Transaction already closed: A query cannot be executed on an expired transaction.',
      ),
      { code: 'P2028' },
    )
    expect(shouldUseDevDbFallback(err)).toBe(true)
  })
})
