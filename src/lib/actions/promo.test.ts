import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isDevWithoutDbMock: vi.fn(() => false),
  promoFindUnique: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  isDevWithoutDb: mocks.isDevWithoutDbMock,
  isRateLimitEnabled: () => false,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: { promoCode: { findUnique: mocks.promoFindUnique } },
}))

import { validatePromoCode } from './promo'

describe('validatePromoCode', () => {
  beforeEach(() => {
    mocks.isDevWithoutDbMock.mockReturnValue(false)
    mocks.promoFindUnique.mockReset()
  })

  it('returns PERCENT discount for a valid row', async () => {
    mocks.promoFindUnique.mockResolvedValue({
      code: 'ten',
      description: 'Ten off',
      discountType: 'PERCENT',
      discountValue: 10,
      maxUses: null,
      usesCount: 0,
      expiresAt: null,
      active: true,
    })
    const r = await validatePromoCode('t1', 'TEN', 10_000)
    expect(r.discountCents).toBe(1000)
    expect(r.discountType).toBe('PERCENT')
    expect(mocks.promoFindUnique).toHaveBeenCalledWith({
      where: { tenantId_code: { tenantId: 't1', code: 'ten' } },
    })
  })

  it('returns FIXED discount capped at subtotal', async () => {
    mocks.promoFindUnique.mockResolvedValue({
      code: 'five',
      description: null,
      discountType: 'FIXED',
      discountValue: 800,
      maxUses: null,
      usesCount: 0,
      expiresAt: null,
      active: true,
    })
    const r = await validatePromoCode('t1', 'five', 500)
    expect(r.discountCents).toBe(500)
  })

  it('throws when code is missing after trim', async () => {
    await expect(validatePromoCode('t1', '   ', 100)).rejects.toThrow(
      /not found/i,
    )
  })

  it('throws when row is missing', async () => {
    mocks.promoFindUnique.mockResolvedValue(null)
    await expect(validatePromoCode('t1', 'nope', 100)).rejects.toThrow(
      /not found/i,
    )
  })

  it('throws when inactive', async () => {
    mocks.promoFindUnique.mockResolvedValue({
      code: 'x',
      description: null,
      discountType: 'PERCENT',
      discountValue: 10,
      maxUses: null,
      usesCount: 0,
      expiresAt: null,
      active: false,
    })
    await expect(validatePromoCode('t1', 'x', 100)).rejects.toThrow(/inactive/i)
  })

  it('throws when expired', async () => {
    mocks.promoFindUnique.mockResolvedValue({
      code: 'x',
      description: null,
      discountType: 'PERCENT',
      discountValue: 10,
      maxUses: null,
      usesCount: 0,
      expiresAt: new Date(Date.now() - 60_000),
      active: true,
    })
    await expect(validatePromoCode('t1', 'x', 100)).rejects.toThrow(/expired/i)
  })

  it('throws when max uses reached', async () => {
    mocks.promoFindUnique.mockResolvedValue({
      code: 'x',
      description: null,
      discountType: 'PERCENT',
      discountValue: 10,
      maxUses: 1,
      usesCount: 1,
      expiresAt: null,
      active: true,
    })
    await expect(validatePromoCode('t1', 'x', 100)).rejects.toThrow(/limit/i)
  })

  it('caps PERCENT discount at subtotal', async () => {
    mocks.promoFindUnique.mockResolvedValue({
      code: 'big',
      description: null,
      discountType: 'PERCENT',
      discountValue: 200,
      maxUses: null,
      usesCount: 0,
      expiresAt: null,
      active: true,
    })
    const r = await validatePromoCode('t1', 'big', 100)
    expect(r.discountCents).toBe(100)
  })

  it('trims and lowercases input for lookup', async () => {
    mocks.promoFindUnique.mockResolvedValue({
      code: 'abc',
      description: null,
      discountType: 'PERCENT',
      discountValue: 10,
      maxUses: null,
      usesCount: 0,
      expiresAt: null,
      active: true,
    })
    await validatePromoCode('t1', '  AbC  ', 1000)
    expect(mocks.promoFindUnique).toHaveBeenCalledWith({
      where: { tenantId_code: { tenantId: 't1', code: 'abc' } },
    })
  })

  it('dev-without-db returns WELCOME10 as 10% off', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    const r = await validatePromoCode('t1', 'WELCOME10', 5000)
    expect(r.discountCents).toBe(500)
    expect(r.code).toBe('welcome10')
    expect(mocks.promoFindUnique).not.toHaveBeenCalled()
  })

  it('dev-without-db throws for unknown mock code', async () => {
    mocks.isDevWithoutDbMock.mockReturnValue(true)
    await expect(validatePromoCode('t1', 'nope', 1000)).rejects.toThrow(
      /not found/i,
    )
  })
})
