import { afterEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.fn()
const redirectMock = vi.fn((url: string) => {
  throw new Error(`__redirect:${url}`)
})
const unauthorizedMock = vi.fn(() => {
  throw new Error('__unauthorized')
})
const headersGet = vi.fn<(name: string) => string | null>(() => null)
const headersMock = vi.fn(async () => ({ get: headersGet }))

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

vi.mock('bcryptjs', () => ({
  compare: vi.fn().mockResolvedValue(false),
  hash: vi.fn().mockResolvedValue('hash'),
}))

vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: authMock,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  AuthError: class AuthError extends Error {},
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({ id: 'credentials' })),
}))

vi.mock('next-auth/jwt', () => ({}))

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  unauthorized: unauthorizedMock,
}))

const { getCurrentUser, requireRole, requireUser } = await import('./auth')

afterEach(() => {
  authMock.mockReset()
  redirectMock.mockClear()
  unauthorizedMock.mockClear()
  headersGet.mockReset()
  headersGet.mockReturnValue(null)
})

function withSession(role: 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN' | null) {
  authMock.mockResolvedValue(
    role == null
      ? null
      : {
          user: {
            id: 'u-1',
            email: 'u@x.test',
            name: 'U',
            role,
            tenantId: 't-1',
          },
        },
  )
}

describe('getCurrentUser', () => {
  it('returns null when there is no session', async () => {
    withSession(null)
    expect(await getCurrentUser()).toBeNull()
  })

  it('returns the resolved user when authenticated', async () => {
    withSession('STAFF')
    expect(await getCurrentUser()).toEqual({
      id: 'u-1',
      email: 'u@x.test',
      name: 'U',
      role: 'STAFF',
      tenantId: 't-1',
    })
  })
})

describe('requireUser', () => {
  it('redirects to /signin when unauthenticated (no x-pathname)', async () => {
    withSession(null)
    headersGet.mockReturnValue(null)
    await expect(requireUser()).rejects.toThrow('__redirect:/signin')
    expect(redirectMock).toHaveBeenCalledWith('/signin')
  })

  it('encodes the from path read from x-pathname', async () => {
    withSession(null)
    headersGet.mockImplementation((name) =>
      name === 'x-pathname' ? '/admin/settings' : null,
    )
    await expect(requireUser()).rejects.toThrow(
      '__redirect:/signin?from=%2Fadmin%2Fsettings',
    )
  })

  it('does not loop when current path is already /signin', async () => {
    withSession(null)
    headersGet.mockImplementation((name) =>
      name === 'x-pathname' ? '/signin' : null,
    )
    await expect(requireUser()).rejects.toThrow('__redirect:/signin')
  })

  it('drops protocol-relative from paths from x-pathname', async () => {
    withSession(null)
    headersGet.mockImplementation((name) =>
      name === 'x-pathname' ? '//evil.com' : null,
    )
    await expect(requireUser()).rejects.toThrow('__redirect:/signin')
    expect(redirectMock).toHaveBeenCalledWith('/signin')
  })

  it('returns the user when authenticated', async () => {
    withSession('ADMIN')
    const user = await requireUser()
    expect(user.role).toBe('ADMIN')
    expect(redirectMock).not.toHaveBeenCalled()
  })
})

describe('requireRole', () => {
  it('throws when called with no allowed roles (programmer error)', async () => {
    withSession('ADMIN')
    await expect(requireRole()).rejects.toThrow(
      /requireRole called without any allowed roles/,
    )
  })

  it('redirects to /signin when unauthenticated', async () => {
    withSession(null)
    await expect(requireRole('STAFF')).rejects.toThrow('__redirect:/signin')
  })

  it('calls unauthorized() when role is not allowed', async () => {
    withSession('CUSTOMER')
    await expect(requireRole('STAFF', 'MANAGER', 'ADMIN')).rejects.toThrow(
      '__unauthorized',
    )
    expect(unauthorizedMock).toHaveBeenCalledOnce()
  })

  it('returns the user when role is allowed', async () => {
    withSession('MANAGER')
    const user = await requireRole('MANAGER', 'ADMIN')
    expect(user.role).toBe('MANAGER')
    expect(unauthorizedMock).not.toHaveBeenCalled()
  })
})
