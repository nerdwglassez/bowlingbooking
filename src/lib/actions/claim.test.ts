import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const claimTokenFindUnique = vi.fn()
  const claimTokenUpdate = vi.fn()
  const userFindUnique = vi.fn()
  const userCreate = vi.fn()
  const bookingUpdate = vi.fn()
  const hashPasswordMock = vi.fn()
  const txStub = {
    user: {
      findUnique: userFindUnique,
      create: userCreate,
    },
    booking: { update: bookingUpdate },
    claimToken: { update: claimTokenUpdate },
  }
  return {
    claimTokenFindUnique,
    claimTokenUpdate,
    userFindUnique,
    userCreate,
    bookingUpdate,
    hashPasswordMock,
    isDevWithoutDbMock: vi.fn(() => false),
    revalidatePathMock: vi.fn(),
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/auth', () => ({
  hashPassword: mocks.hashPasswordMock,
}))
vi.mock('@/lib/env', () => ({
  isDevWithoutDb: mocks.isDevWithoutDbMock,
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePathMock }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    claimToken: {
      findUnique: mocks.claimTokenFindUnique,
    },
    $transaction: mocks.txMock,
  },
}))

import { claimBookingAccountAction } from '@/lib/actions/claim'

function validClaim() {
  return {
    id: 'claim_1',
    bookingId: 'booking_1',
    tenantId: 'tenant_1',
    email: 'Customer@Example.com',
    claimedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    booking: { id: 'booking_1' },
  }
}

describe('claimBookingAccountAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.claimTokenFindUnique.mockResolvedValue(validClaim())
    mocks.hashPasswordMock.mockResolvedValue('hashed-password')
    mocks.userCreate.mockResolvedValue({ id: 'user_new' })
  })

  it('creates a customer account and links the booking for a valid claim', async () => {
    mocks.userFindUnique.mockResolvedValue(null)

    const result = await claimBookingAccountAction({
      token: 'claim-token',
      password: 'longenough',
      name: 'Customer',
    })

    expect(result).toEqual({ ok: true, signInEmail: 'customer@example.com' })
    expect(mocks.hashPasswordMock).toHaveBeenCalledWith('longenough')
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        email: 'customer@example.com',
        name: 'Customer',
        passwordHash: 'hashed-password',
        role: 'CUSTOMER',
        tenantId: 'tenant_1',
      },
      select: { id: true },
    })
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
      data: { userId: 'user_new' },
    })
    expect(mocks.claimTokenUpdate).toHaveBeenCalledWith({
      where: { id: 'claim_1' },
      data: { claimedAt: expect.any(Date) },
    })
  })

  it('links an existing customer without overwriting their password', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'user_existing',
      role: 'CUSTOMER',
    })

    await claimBookingAccountAction({
      token: 'claim-token',
      password: 'attacker-password',
    })

    expect(mocks.hashPasswordMock).not.toHaveBeenCalled()
    expect(mocks.userCreate).not.toHaveBeenCalled()
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
      data: { userId: 'user_existing' },
    })
    expect(mocks.claimTokenUpdate).toHaveBeenCalled()
  })

  it('rejects claims for existing team accounts', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: 'user_admin',
      role: 'ADMIN',
    })

    await expect(
      claimBookingAccountAction({
        token: 'claim-token',
        password: 'longenough',
      }),
    ).rejects.toThrow(/team account/i)

    expect(mocks.hashPasswordMock).not.toHaveBeenCalled()
    expect(mocks.userCreate).not.toHaveBeenCalled()
    expect(mocks.bookingUpdate).not.toHaveBeenCalled()
    expect(mocks.claimTokenUpdate).not.toHaveBeenCalled()
  })
})
