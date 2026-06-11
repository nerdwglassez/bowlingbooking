import { afterEach, describe, expect, it, vi } from 'vitest'

const { findFirstMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  isDevWithoutDb: vi.fn(() => false),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findFirst: findFirstMock },
  },
}))

import { isDevWithoutDb } from '@/lib/env'
import {
  customerBookingDetailPath,
  getPostSignInPath,
} from './post-sign-in'

afterEach(() => {
  findFirstMock.mockReset()
  vi.mocked(isDevWithoutDb).mockReturnValue(false)
})

describe('customerBookingDetailPath', () => {
  it('builds find-my-booking URL with encoded email', () => {
    expect(customerBookingDetailPath('abc12', 'Jane@Example.com')).toBe(
      '/find-my-booking/ABC12?email=jane%40example.com',
    )
  })
})

describe('getPostSignInPath', () => {
  it('never sends staff to a booking path via deep link', async () => {
    await expect(
      getPostSignInPath('/book/confirm', {
        id: 'u_staff',
        role: 'STAFF',
        email: 'staff@royalz.local',
      }),
    ).resolves.toBe('/staff')
  })

  it('sends staff to /staff when from is a booking path', async () => {
    await expect(
      getPostSignInPath('/book/package', {
        id: 'u_staff',
        role: 'STAFF',
        email: 'staff@royalz.local',
      }),
    ).resolves.toBe('/staff')
  })

  it('sends admin to /staff when from is a booking path', async () => {
    await expect(
      getPostSignInPath('/book', {
        id: 'u_admin',
        role: 'ADMIN',
        email: 'admin@royalz.local',
      }),
    ).resolves.toBe('/staff')
  })

  it('returns customer to booking step when from is a booking path', async () => {
    await expect(
      getPostSignInPath('/book/details', {
        id: 'u_cust',
        role: 'CUSTOMER',
        email: 'bowler@example.com',
      }),
    ).resolves.toBe('/book/details')
  })

  it('sends admin to /staff when from=/staff', async () => {
    await expect(
      getPostSignInPath('/staff', {
        id: 'u1',
        role: 'ADMIN',
        email: 'admin@royalz.local',
      }),
    ).resolves.toBe('/staff')
  })

  it('sends customer with upcoming booking to dashboard', async () => {
    findFirstMock.mockResolvedValueOnce({
      confirmationCode: 'RZ9K2M',
    })
    await expect(
      getPostSignInPath('/', {
        id: 'u_cust',
        role: 'CUSTOMER',
        email: 'bowler@example.com',
      }),
    ).resolves.toBe('/dashboard')
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ userId: 'u_cust' }, { customerEmail: 'bowler@example.com' }],
        }),
      }),
    )
  })

  it('falls back to find-my-booking when customer has no bookings', async () => {
    findFirstMock.mockResolvedValue(null)
    await expect(
      getPostSignInPath('/', {
        id: 'u_cust',
        role: 'CUSTOMER',
        email: 'nobookings@example.com',
      }),
    ).resolves.toBe('/find-my-booking')
  })

  it('uses mock booking path in dev-without-db', async () => {
    vi.mocked(isDevWithoutDb).mockReturnValue(true)
    await expect(
      getPostSignInPath('/', {
        id: 'u_cust',
        role: 'CUSTOMER',
        email: 'jane@example.com',
      }),
    ).resolves.toBe('/find-my-booking/MOCK01?email=jane%40example.com')
    expect(findFirstMock).not.toHaveBeenCalled()
  })
})
