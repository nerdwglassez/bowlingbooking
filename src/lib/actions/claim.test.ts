import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const userFindUnique = vi.fn()
  const userCreate = vi.fn()
  const bookingUpdate = vi.fn()
  const claimTokenUpdate = vi.fn()
  const txStub = {
    user: { findUnique: userFindUnique, create: userCreate },
    booking: { update: bookingUpdate },
    claimToken: { update: claimTokenUpdate },
  }
  return {
    isDevWithoutDbMock: vi.fn(() => false),
    hashPasswordMock: vi.fn(async () => 'hashed-password'),
    revalidatePathMock: vi.fn(),
    claimTokenFindUnique: vi.fn(),
    claimTokenFindFirst: vi.fn(),
    userFindUnique,
    userCreate,
    bookingUpdate,
    claimTokenUpdate,
    txMock: vi.fn(
      async (fn: (tx: typeof txStub) => Promise<unknown>) => fn(txStub),
    ),
  }
})

vi.mock('@/lib/env', () => ({
  isDevWithoutDb: mocks.isDevWithoutDbMock,
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: mocks.hashPasswordMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePathMock,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    claimToken: {
      findUnique: mocks.claimTokenFindUnique,
      findFirst: mocks.claimTokenFindFirst,
    },
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.txMock,
  },
}))

import {
  claimBookingAccountAction,
  getClaimTokenForBooking,
} from '@/lib/actions/claim'

const future = new Date(Date.now() + 60_000)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isDevWithoutDbMock.mockReturnValue(false)
  mocks.hashPasswordMock.mockResolvedValue('hashed-password')
  mocks.claimTokenFindUnique.mockResolvedValue({
    id: 'claim_1',
    bookingId: 'booking_1',
    tenantId: 'tenant_1',
    email: 'Guest@Example.com',
    claimedAt: null,
    expiresAt: future,
  })
  mocks.claimTokenFindFirst.mockResolvedValue({
    token: 'claim-token',
    claimedAt: null,
    expiresAt: future,
  })
  mocks.userFindUnique.mockResolvedValue(null)
  mocks.userCreate.mockResolvedValue({ id: 'user_1' })
  mocks.bookingUpdate.mockResolvedValue({})
  mocks.claimTokenUpdate.mockResolvedValue({})
  mocks.txMock.mockImplementation(async (fn) =>
    fn({
      user: {
        findUnique: mocks.userFindUnique,
        create: mocks.userCreate,
      },
      booking: { update: mocks.bookingUpdate },
      claimToken: { update: mocks.claimTokenUpdate },
    }),
  )
})

describe('claimBookingAccountAction', () => {
  it('creates a new customer account for an unclaimed token', async () => {
    const result = await claimBookingAccountAction({
      token: 'claim-token',
      password: 'password123',
      name: 'Guest',
    })

    expect(result).toEqual({ ok: true, signInEmail: 'guest@example.com' })
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        email: 'guest@example.com',
        name: 'Guest',
        passwordHash: 'hashed-password',
        role: 'CUSTOMER',
        tenantId: 'tenant_1',
      },
    })
    expect(mocks.bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking_1' },
      data: { userId: 'user_1' },
    })
    expect(mocks.claimTokenUpdate).toHaveBeenCalledWith({
      where: { id: 'claim_1' },
      data: { claimedAt: expect.any(Date) },
    })
  })

  it('does not overwrite an existing account for the booking email', async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ id: 'staff_1' })

    await expect(
      claimBookingAccountAction({
        token: 'claim-token',
        password: 'password123',
      }),
    ).rejects.toThrow('An account already exists for this email')

    expect(mocks.hashPasswordMock).not.toHaveBeenCalled()
    expect(mocks.txMock).not.toHaveBeenCalled()
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it('rechecks existing accounts inside the create transaction', async () => {
    mocks.userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'customer_1' })

    await expect(
      claimBookingAccountAction({
        token: 'claim-token',
        password: 'password123',
      }),
    ).rejects.toThrow('An account already exists for this email')

    expect(mocks.hashPasswordMock).toHaveBeenCalled()
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })
})

describe('getClaimTokenForBooking', () => {
  it('requires the booking id, email, and confirmation code to match', async () => {
    const token = await getClaimTokenForBooking(
      'booking_1',
      'Guest@Example.com',
      'abc123',
    )

    expect(token).toBe('claim-token')
    expect(mocks.claimTokenFindFirst).toHaveBeenCalledWith({
      where: {
        bookingId: 'booking_1',
        booking: {
          is: {
            confirmationCode: 'ABC123',
            customerEmail: {
              equals: 'guest@example.com',
              mode: 'insensitive',
            },
          },
        },
      },
      select: { token: true, claimedAt: true, expiresAt: true },
    })
  })

  it('returns null without complete booking proof', async () => {
    await expect(getClaimTokenForBooking('booking_1', '', 'ABC123')).resolves.toBe(
      null,
    )
    expect(mocks.claimTokenFindFirst).not.toHaveBeenCalled()
  })
})
