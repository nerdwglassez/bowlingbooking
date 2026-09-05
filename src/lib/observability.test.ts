import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const scope = {
    setTag: vi.fn(),
    setUser: vi.fn(),
    setTransactionName: vi.fn(),
    setExtra: vi.fn(),
  }
  return {
    scope,
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    withScope: vi.fn((fn: (s: typeof scope) => void) => fn(scope)),
    getCurrentScope: vi.fn(() => scope),
    startSpan: vi.fn(
      async (
        _opts: unknown,
        fn: () => Promise<unknown> | unknown,
      ) => fn(),
    ),
    warnOnceMock: vi.fn(),
  }
})

vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
  captureMessage: mocks.captureMessage,
  withScope: mocks.withScope,
  getCurrentScope: mocks.getCurrentScope,
  startSpan: mocks.startSpan,
}))

vi.mock('@/lib/env', () => ({
  warnOnce: mocks.warnOnceMock,
  isDevWithoutDb: vi.fn(() => true),
}))

import {
  captureException,
  captureMessage,
  setObservabilitySurface,
  withObservability,
  withStaffPageSpan,
} from './observability'

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SENTRY_DSN
  delete process.env.SENTRY_DSN
  vi.clearAllMocks()
})

describe('captureException', () => {
  it('logs to console and skips Sentry when no DSN is set', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    captureException(new Error('boom'), { action: 'test' })
    expect(spy).toHaveBeenCalled()
    expect(mocks.captureException).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('forwards to Sentry with scope when DSN is set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    const err = new Error('boom')
    captureException(err, {
      action: 'doTheThing',
      tenantId: 't_1',
      userId: 'u_1',
      tags: { category: 'payments' },
      extra: { bookingId: 'bk_1' },
    })
    expect(mocks.withScope).toHaveBeenCalled()
    expect(mocks.scope.setTag).toHaveBeenCalledWith('tenantId', 't_1')
    expect(mocks.scope.setTag).toHaveBeenCalledWith('category', 'payments')
    expect(mocks.scope.setUser).toHaveBeenCalledWith({ id: 'u_1' })
    expect(mocks.scope.setTransactionName).toHaveBeenCalledWith('doTheThing')
    expect(mocks.scope.setExtra).toHaveBeenCalledWith('bookingId', 'bk_1')
    expect(mocks.captureException).toHaveBeenCalledWith(err)
  })

  it('emits a one-shot warning in production when no DSN is set', () => {
    vi.stubEnv('NODE_ENV', 'production')
    captureException(new Error('boom'))
    expect(mocks.warnOnceMock).toHaveBeenCalledWith(
      'sentry-dsn',
      expect.stringContaining('NEXT_PUBLIC_SENTRY_DSN'),
    )
    vi.unstubAllEnvs()
  })
})

describe('captureMessage', () => {
  it('logs to console when no DSN is set', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    captureMessage('hello', { action: 'test' })
    expect(spy).toHaveBeenCalled()
    expect(mocks.captureMessage).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('forwards to Sentry with explicit level when DSN is set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    captureMessage('something odd', { level: 'warning', tenantId: 't_1' })
    expect(mocks.captureMessage).toHaveBeenCalledWith('something odd', 'warning')
    expect(mocks.scope.setTag).toHaveBeenCalledWith('tenantId', 't_1')
  })

  it('defaults to info level when none is given', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    captureMessage('plain')
    expect(mocks.captureMessage).toHaveBeenCalledWith('plain', 'info')
  })
})

describe('withObservability', () => {
  it('returns the wrapped function result on success', async () => {
    const wrapped = withObservability('myAction', async (n: number) => n * 2)
    await expect(wrapped(3)).resolves.toBe(6)
    expect(mocks.captureException).not.toHaveBeenCalled()
  })

  it('captures and re-throws on failure', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    const err = new Error('explode')
    const wrapped = withObservability('myAction', async () => {
      throw err
    })
    await expect(wrapped()).rejects.toThrow('explode')
    expect(mocks.captureException).toHaveBeenCalledWith(err)
    expect(mocks.scope.setTransactionName).toHaveBeenCalledWith('myAction')
  })
})

describe('setObservabilitySurface', () => {
  it('is a no-op without a DSN', () => {
    setObservabilitySurface('staff', '/staff')
    expect(mocks.getCurrentScope).not.toHaveBeenCalled()
  })

  it('tags the current scope when a DSN is set', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    setObservabilitySurface('staff', '/staff')
    expect(mocks.scope.setTag).toHaveBeenCalledWith('app', 'staff')
    expect(mocks.scope.setTag).toHaveBeenCalledWith('surface', 'staff')
    expect(mocks.scope.setTag).toHaveBeenCalledWith('staff.route', '/staff')
  })
})

describe('withStaffPageSpan', () => {
  it('runs the callback without a span when no DSN is set', async () => {
    await expect(withStaffPageSpan('staff.cockpit.load', async () => 7)).resolves.toBe(7)
    expect(mocks.startSpan).not.toHaveBeenCalled()
  })

  it('starts a staff load span when a DSN is set', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/1'
    await expect(withStaffPageSpan('staff.cockpit.load', async () => 9)).resolves.toBe(9)
    expect(mocks.startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'staff.cockpit.load',
        op: 'ui.load',
        forceTransaction: true,
      }),
      expect.any(Function),
    )
  })
})
