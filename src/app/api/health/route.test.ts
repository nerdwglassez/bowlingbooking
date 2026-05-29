import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getTenantMock: vi.fn(),
  hasDatabaseUrlMock: vi.fn(),
  isDevWithoutDbMock: vi.fn(),
  hasAuthSecretMock: vi.fn(() => true),
  getAuthUrlHostMock: vi.fn(() => 'bowling.example.com'),
  resolveAuthUrlForChecksMock: vi.fn(() => 'https://bowling.example.com'),
}))

vi.mock('@/lib/env', () => ({
  getAuthUrlHost: mocks.getAuthUrlHostMock,
  hasAuthSecret: mocks.hasAuthSecretMock,
  hasDatabaseUrl: mocks.hasDatabaseUrlMock,
  isDevWithoutDb: mocks.isDevWithoutDbMock,
  resolveAuthUrlForChecks: mocks.resolveAuthUrlForChecksMock,
}))

vi.mock('@/lib/tenant', () => ({
  getTenant: mocks.getTenantMock,
}))

import { GET } from './route'

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getTenantMock.mockResolvedValue({
      id: 't1',
      slug: 'royalz',
      name: 'Royal Z Lanes',
    })
    mocks.hasAuthSecretMock.mockReturnValue(true)
    mocks.getAuthUrlHostMock.mockReturnValue('bowling.example.com')
    mocks.resolveAuthUrlForChecksMock.mockReturnValue('https://bowling.example.com')
  })

  it('returns tenantSlug on success', async () => {
    mocks.hasDatabaseUrlMock.mockReturnValue(true)
    mocks.isDevWithoutDbMock.mockReturnValue(false)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true, tenantSlug: 'royalz', tenantId: 't1' })
    expect(body.mode).toBeUndefined()
  })

  it('returns tenantSlug in dev-without-db mode', async () => {
    mocks.hasDatabaseUrlMock.mockReturnValue(false)
    mocks.isDevWithoutDbMock.mockReturnValue(true)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      ok: true,
      tenantSlug: 'royalz',
      mode: 'mock',
    })
    expect(body.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('DATABASE_URL unset'),
      ]),
    )
  })

  it('returns 503 when DATABASE_URL missing in production', async () => {
    mocks.hasDatabaseUrlMock.mockReturnValue(false)
    mocks.isDevWithoutDbMock.mockReturnValue(false)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.ok).toBe(false)
    expect(body.error).toContain('DATABASE_URL')
    expect(mocks.getTenantMock).not.toHaveBeenCalled()
  })
})
