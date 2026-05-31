import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  bookingFindMany: vi.fn(),
  isDevWithoutDbMock: vi.fn(() => true),
}))

vi.mock('@/lib/auth', () => ({
  requireRole: mocks.requireRoleMock,
}))

vi.mock('@/lib/env', () => ({
  shouldUseDevDbFallback: (err?: unknown) =>
    mocks.isDevWithoutDbMock() ||
    (err !== undefined &&
      err instanceof Error &&
      err.message.includes("Can't reach database server")),
  warnOnce: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findMany: mocks.bookingFindMany },
  },
}))

import {
  getStaffAnalyticsSummary,
  getStaffContactDetail,
  listStaffContacts,
} from '@/lib/actions/staff-reports'
import { contactIdFromEmail } from '@/lib/reports-display'

describe('staff-reports actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRoleMock.mockResolvedValue({
      id: 'u1',
      role: 'MANAGER',
      email: 'mgr@test.com',
    })
    mocks.isDevWithoutDbMock.mockReturnValue(true)
  })

  it('requires MANAGER or ADMIN for analytics', async () => {
    await getStaffAnalyticsSummary('t1', 'month')
    expect(mocks.requireRoleMock).toHaveBeenCalledWith('MANAGER', 'ADMIN')
  })

  it('returns mock analytics for month', async () => {
    const summary = await getStaffAnalyticsSummary('t1', 'month')
    expect(summary.bookingCount).toBe(184)
    expect(summary.packages.length).toBeGreaterThan(0)
    expect(mocks.bookingFindMany).not.toHaveBeenCalled()
  })

  it('returns mock contacts sorted list', async () => {
    const contacts = await listStaffContacts('t1')
    expect(contacts.length).toBeGreaterThan(1)
    expect(contacts[0].name).toBeTruthy()
  })

  it('returns Jordan Rivera contact detail mock', async () => {
    const id = contactIdFromEmail('jordan@acmecorp.com')
    const detail = await getStaffContactDetail('t1', id)
    expect(detail?.name).toBe('Jordan Rivera')
    expect(detail?.history.length).toBeGreaterThan(1)
  })
})
