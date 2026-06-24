import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hasProductionResendSender,
  hasResendApiKey,
  isDevWithoutDb,
  isPlausibleResendFrom,
  isPrismaConnectivityError,
  resolveAppBaseUrl,
  resolveResendFromEmail,
  RESEND_SANDBOX_FROM,
  shouldUseDevDbFallback,
} from './env'

describe('hasResendApiKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true when RESEND_API_KEY is set', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    expect(hasResendApiKey()).toBe(true)
  })

  it('returns false when RESEND_API_KEY is missing or blank', () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect(hasResendApiKey()).toBe(false)
    vi.stubEnv('RESEND_API_KEY', '   ')
    expect(hasResendApiKey()).toBe(false)
  })
})

describe('isPlausibleResendFrom', () => {
  it('accepts verified-domain style addresses', () => {
    expect(isPlausibleResendFrom('Royal Z Lanes <bookings@royalz.com>')).toBe(
      true,
    )
  })

  it('rejects placeholder, sandbox, and Vercel-host misconfigurations', () => {
    expect(isPlausibleResendFrom('Royal Z Lanes <bookings@royalz.local>')).toBe(
      false,
    )
    expect(isPlausibleResendFrom('onboarding@resend.dev')).toBe(false)
    expect(
      isPlausibleResendFrom(
        'Royal Z Lanes <bookings@bowlingbookingv2.vercel.app>',
      ),
    ).toBe(false)
  })
})

describe('resolveResendFromEmail', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('uses RESEND_FROM_EMAIL when plausible', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Royal Z Lanes <bookings@royalz.com>')
    expect(resolveResendFromEmail()).toBe(
      'Royal Z Lanes <bookings@royalz.com>',
    )
  })

  it('falls back to Resend sandbox outside production when from is invalid but API key is set', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv(
      'RESEND_FROM_EMAIL',
      'Royal Z Lanes <bookings@bowlingbookingv2.vercel.app>',
    )
    expect(resolveResendFromEmail()).toBe(RESEND_SANDBOX_FROM)
  })

  it('rejects Resend sandbox sender in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('RESEND_FROM_EMAIL', RESEND_SANDBOX_FROM)
    expect(() => resolveResendFromEmail()).toThrow(
      /verified Resend domain in production/,
    )
  })

  it('uses mock from when Resend is not configured', () => {
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('RESEND_FROM_EMAIL', '')
    expect(resolveResendFromEmail()).toBe(
      'Royal Z Lanes <bookings@royalz.local>',
    )
  })
})

describe('hasProductionResendSender', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires both API key and verified-domain style sender', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Royal Z Lanes <bookings@royalz.com>')
    expect(hasProductionResendSender()).toBe(true)

    vi.stubEnv('RESEND_FROM_EMAIL', RESEND_SANDBOX_FROM)
    expect(hasProductionResendSender()).toBe(false)

    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Royal Z Lanes <bookings@royalz.com>')
    expect(hasProductionResendSender()).toBe(false)
  })
})

describe('resolveAppBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers NEXT_PUBLIC_APP_URL when set', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://book.example.com/')
    vi.stubEnv('AUTH_URL', 'https://auth.example.com')
    expect(resolveAppBaseUrl()).toBe('https://book.example.com')
  })

  it('falls back to AUTH_URL then VERCEL_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('AUTH_URL', 'https://royalz.example.com/')
    expect(resolveAppBaseUrl()).toBe('https://royalz.example.com')

    vi.stubEnv('AUTH_URL', '')
    vi.stubEnv('VERCEL_URL', 'royalz-lanes.vercel.app')
    expect(resolveAppBaseUrl()).toBe('https://royalz-lanes.vercel.app')
  })

  it('defaults to localhost when no URL env is set', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    vi.stubEnv('AUTH_URL', '')
    vi.stubEnv('VERCEL_URL', '')
    expect(resolveAppBaseUrl()).toBe('http://localhost:3000')
  })
})

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
