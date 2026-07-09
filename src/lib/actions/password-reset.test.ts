import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const userUpdate = vi.fn()
  const tokenUpdateMany = vi.fn()
  const auditCreate = vi.fn()
  const txStub = {
    user: { update: userUpdate },
    passwordResetToken: { updateMany: tokenUpdateMany },
    auditLog: { create: auditCreate },
  }
  return {
    hashPasswordMock: vi.fn(),
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    tokenFindUnique: vi.fn(),
    userUpdate,
    tokenUpdateMany,
    auditCreate,
    transactionMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({ hashPassword: mocks.hashPasswordMock }))
vi.mock('@/lib/email', () => ({ sendPasswordResetEmail: vi.fn() }))
vi.mock('@/lib/env', () => ({ isDevWithoutDb: mocks.isDevWithoutDbMock }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    passwordResetToken: { findUnique: mocks.tokenFindUnique },
    $transaction: mocks.transactionMock,
  },
}))

import { resetPasswordAction } from './password-reset'

describe('resetPasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.hashPasswordMock.mockResolvedValue('hashed:new-password')
    mocks.tokenFindUnique.mockResolvedValue({
      id: 'prt_1',
      userId: 'user_1',
      tokenHash: 'hashed-token',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'user_1' },
    })
  })

  it('marks every outstanding reset token used after setting a password', async () => {
    await resetPasswordAction({
      token: 'raw-token',
      password: 'new-password',
    })

    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { passwordHash: 'hashed:new-password' },
    })
    expect(mocks.tokenUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PASSWORD_RESET_COMPLETED',
        entityId: 'user_1',
      }),
    })
  })
})
