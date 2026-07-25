import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const teamInviteTokenFindUnique = vi.fn()
  const teamInviteTokenUpdate = vi.fn()
  const teamInviteTokenDeleteMany = vi.fn()
  const teamInviteTokenCreate = vi.fn()
  const userFindUnique = vi.fn()
  const userUpdate = vi.fn()
  const auditCreate = vi.fn()
  const sendTeamInviteEmailMock = vi.fn()
  const getTenantMock = vi.fn()
  const hashPasswordMock = vi.fn()
  const requireRoleMock = vi.fn()
  const txStub = {
    teamInviteToken: {
      deleteMany: teamInviteTokenDeleteMany,
      create: teamInviteTokenCreate,
      update: teamInviteTokenUpdate,
    },
    user: { update: userUpdate },
    auditLog: { create: auditCreate },
  }
  return {
    teamInviteTokenFindUnique,
    teamInviteTokenUpdate,
    teamInviteTokenDeleteMany,
    teamInviteTokenCreate,
    userFindUnique,
    userUpdate,
    auditCreate,
    sendTeamInviteEmailMock,
    getTenantMock,
    hashPasswordMock,
    requireRoleMock,
    isDevWithoutDbMock: vi.fn(() => false),
    hasResendApiKeyMock: vi.fn(() => true),
    revalidatePathMock: vi.fn(),
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({
  requireRole: mocks.requireRoleMock,
  hashPassword: mocks.hashPasswordMock,
}))
vi.mock('@/lib/env', () => ({
  isDevWithoutDb: mocks.isDevWithoutDbMock,
  hasResendApiKey: mocks.hasResendApiKeyMock,
  resolveAppBaseUrl: () => 'http://localhost:3000',
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/email', () => ({
  sendTeamInviteEmail: mocks.sendTeamInviteEmailMock,
}))
vi.mock('@/lib/tenant', () => ({
  getTenant: mocks.getTenantMock,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamInviteToken: {
      findUnique: mocks.teamInviteTokenFindUnique,
      update: mocks.teamInviteTokenUpdate,
    },
    user: {
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    $transaction: mocks.txMock,
  },
}))

import {
  acceptTeamInviteAction,
  resendTeamInviteAction,
} from '@/lib/actions/team-invite'

function adminUser() {
  return {
    id: 'user_admin',
    email: 'admin@royalz.local',
    name: 'Site Admin',
    role: 'ADMIN' as const,
    tenantId: 't1',
  }
}

function managerUser() {
  return {
    id: 'user_mgr',
    email: 'manager@royalz.local',
    name: 'Manager',
    role: 'MANAGER' as const,
    tenantId: 't1',
  }
}

describe('acceptTeamInviteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hashPasswordMock.mockResolvedValue('hashed:pw')
  })

  it('rejects short password', async () => {
    await expect(
      acceptTeamInviteAction({ token: 'abc', password: 'short' }),
    ).rejects.toThrow(/8 characters/i)
  })

  it('rejects invalid or expired token', async () => {
    mocks.teamInviteTokenFindUnique.mockResolvedValue(null)
    await expect(
      acceptTeamInviteAction({ token: 'bad', password: 'longenough' }),
    ).rejects.toThrow(/invalid or has expired/i)
  })

  it('sets password and marks token used', async () => {
    mocks.teamInviteTokenFindUnique.mockResolvedValue({
      id: 'invite_1',
      userId: 'user_new',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { role: 'STAFF' },
    })
    mocks.teamInviteTokenUpdate.mockResolvedValue({})
    mocks.userUpdate.mockResolvedValue({})

    await acceptTeamInviteAction({ token: 'rawtoken', password: 'longenough' })

    expect(mocks.hashPasswordMock).toHaveBeenCalledWith('longenough')
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: 'user_new' },
      data: { passwordHash: 'hashed:pw' },
    })
    expect(mocks.teamInviteTokenUpdate).toHaveBeenCalledWith({
      where: { id: 'invite_1' },
      data: { usedAt: expect.any(Date) },
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'TEAM_USER_INVITE_ACCEPTED' }),
    })
  })

  it('rejects stale invite links after a password has already been set', async () => {
    mocks.teamInviteTokenFindUnique.mockResolvedValue({
      id: 'invite_1',
      userId: 'user_new',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: { role: 'STAFF', passwordHash: 'hashed-existing' },
    })

    await expect(
      acceptTeamInviteAction({ token: 'rawtoken', password: 'longenough' }),
    ).rejects.toThrow(/invalid or has expired/i)

    expect(mocks.hashPasswordMock).not.toHaveBeenCalled()
    expect(mocks.userUpdate).not.toHaveBeenCalled()
    expect(mocks.teamInviteTokenUpdate).not.toHaveBeenCalled()
  })
})

describe('resendTeamInviteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hasResendApiKeyMock.mockReturnValue(true)
    mocks.requireRoleMock.mockResolvedValue(adminUser())
    mocks.getTenantMock.mockResolvedValue({ name: 'Royal Z Lanes' })
    mocks.sendTeamInviteEmailMock.mockResolvedValue({ id: 'email_1', delivered: true })
    mocks.teamInviteTokenDeleteMany.mockResolvedValue({ count: 1 })
    mocks.teamInviteTokenCreate.mockResolvedValue({ id: 'invite_2' })
  })

  it('rejects when user already accepted invite', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'user_new',
      email: 'new@example.com',
      role: 'STAFF',
      passwordHash: 'hashed',
      tenantId: 't1',
    })
    await expect(
      resendTeamInviteAction({ userId: 'user_new' }),
    ).rejects.toThrow(/already accepted/i)
  })

  it('rejects MANAGER resending a pending ADMIN invite without rotating tokens', async () => {
    mocks.requireRoleMock.mockResolvedValue(managerUser())
    mocks.userFindUnique.mockResolvedValue({
      id: 'user_admin_pending',
      email: 'admin-pending@example.com',
      role: 'ADMIN',
      passwordHash: null,
      tenantId: 't1',
    })

    await expect(
      resendTeamInviteAction({ userId: 'user_admin_pending' }),
    ).rejects.toThrow(/ADMIN/)

    expect(mocks.teamInviteTokenDeleteMany).not.toHaveBeenCalled()
    expect(mocks.teamInviteTokenCreate).not.toHaveBeenCalled()
    expect(mocks.sendTeamInviteEmailMock).not.toHaveBeenCalled()
  })

  it('rotates token and sends invite email for pending user', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'user_new',
      email: 'new@example.com',
      role: 'STAFF',
      passwordHash: null,
      tenantId: 't1',
    })

    await resendTeamInviteAction({
      userId: 'user_new',
      personalMessage: 'Try again',
    })

    expect(mocks.teamInviteTokenDeleteMany).toHaveBeenCalled()
    expect(mocks.teamInviteTokenCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_new',
        personalMessage: 'Try again',
      }),
    })
    expect(mocks.sendTeamInviteEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@example.com',
        role: 'STAFF',
        personalMessage: 'Try again',
      }),
    )
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'TEAM_USER_INVITE_RESENT' }),
    })
  })

  it('returns inviteUrl when email delivery is not configured', async () => {
    mocks.hasResendApiKeyMock.mockReturnValue(false)
    mocks.userFindUnique.mockResolvedValue({
      id: 'user_new',
      email: 'new@example.com',
      role: 'STAFF',
      passwordHash: null,
      tenantId: 't1',
    })

    const result = await resendTeamInviteAction({ userId: 'user_new' })

    expect(result.emailDelivered).toBe(false)
    expect(result.inviteUrl).toMatch(/\/accept-invite\?token=/)
    expect(mocks.sendTeamInviteEmailMock).not.toHaveBeenCalled()
  })

  it('returns inviteUrl and emailError when Resend rejects the send', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'user_new',
      email: 'new@example.com',
      role: 'STAFF',
      passwordHash: null,
      tenantId: 't1',
    })
    mocks.sendTeamInviteEmailMock.mockRejectedValue(
      new Error('Resend send failed: domain is not verified'),
    )

    const result = await resendTeamInviteAction({ userId: 'user_new' })

    expect(result.emailDelivered).toBe(false)
    expect(result.inviteUrl).toMatch(/\/accept-invite\?token=/)
    expect(result.emailError).toContain('domain is not verified')
  })
})
