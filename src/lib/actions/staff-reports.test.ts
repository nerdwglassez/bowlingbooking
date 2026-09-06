import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  bookingFindMany: vi.fn(),
  tenantFindUnique: vi.fn(),
  auditLogCreate: vi.fn(),
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
    tenant: { findUnique: mocks.tenantFindUnique },
    auditLog: { create: mocks.auditLogCreate },
  },
}))

import {
  exportStaffAnalyticsCsvAction,
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
      tenantId: 't1',
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

  it('rejects cross-tenant analytics tenantId', async () => {
    await expect(
      getStaffAnalyticsSummary('other-tenant', 'month'),
    ).rejects.toThrow(/not found/i)
  })

  it('rejects cross-tenant contacts tenantId', async () => {
    await expect(listStaffContacts('other-tenant')).rejects.toThrow(/not found/i)
  })

  it('mock analytics includes net revenue, source mix, and timezone', async () => {
    const summary = await getStaffAnalyticsSummary('t1', 'month')
    expect(summary.refundTotalCents).toBeGreaterThanOrEqual(0)
    expect(summary.netRevenueCents).toBeLessThanOrEqual(summary.revenueCents)
    expect(summary.sourceMix.map((s) => s.source)).toEqual([
      'ONLINE',
      'WALK_IN',
      'PHONE',
    ])
    expect(summary.timezone).toBeTruthy()
  })

  it('exports analytics CSV and writes REPORT_EXPORTED audit when DB available', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.tenantFindUnique.mockResolvedValue({ timezone: 'America/New_York' })
    mocks.bookingFindMany.mockResolvedValue([])
    mocks.auditLogCreate.mockResolvedValue({ id: 'aud-1' })

    const result = await exportStaffAnalyticsCsvAction('t1', 'month')
    expect(result.csv).toContain('gross_revenue_cents')
    expect(result.csv).toContain('net_revenue_cents')
    expect(result.filename).toMatch(/staff-analytics-month-/)
    expect(mocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          action: 'REPORT_EXPORTED',
          entityType: 'Report',
        }),
      }),
    )
  })
})
