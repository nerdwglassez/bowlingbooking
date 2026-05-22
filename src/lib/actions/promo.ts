'use server'

import type { PromoDiscountType } from '@prisma/client'

import type { PromoValidationResult } from '@/types'
import { isDevWithoutDb } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export type { PromoValidationResult } from '@/types'

function computeDiscountCents(
  discountType: PromoDiscountType,
  discountValue: number,
  subtotalCents: number,
): number {
  if (discountType === 'PERCENT') {
    return Math.min(
      subtotalCents,
      Math.floor((subtotalCents * discountValue) / 100),
    )
  }
  return Math.min(discountValue, subtotalCents)
}

function devMockValidate(
  code: string,
  subtotalCents: number,
): PromoValidationResult {
  if (code === 'welcome10') {
    const discountType = 'PERCENT' as const
    const discountValue = 10
    return {
      code,
      description: 'Welcome — 10% off',
      discountType,
      discountValue,
      discountCents: computeDiscountCents('PERCENT', discountValue, subtotalCents),
    }
  }
  if (code === 'off500') {
    const discountType = 'FIXED' as const
    const discountValue = 500
    return {
      code,
      description: '$5 off',
      discountType,
      discountValue,
      discountCents: computeDiscountCents('FIXED', discountValue, subtotalCents),
    }
  }
  throw new Error('Promo code not found')
}

/**
 * Validate a promo code against a tenant + subtotal. Returns the resolved
 * discount in cents. Throws Error with a user-safe message on failure.
 *
 * Public action (no auth) — the customer is in mid-booking and not signed in.
 */
export async function validatePromoCode(
  tenantId: string,
  rawCode: string,
  subtotalCents: number,
): Promise<PromoValidationResult> {
  const code = rawCode.trim().toLowerCase()
  if (!code) {
    throw new Error('Promo code not found')
  }
  if (subtotalCents < 0 || !Number.isFinite(subtotalCents)) {
    throw new Error('Invalid booking total')
  }

  if (isDevWithoutDb()) {
    return devMockValidate(code, subtotalCents)
  }

  const row = await prisma.promoCode.findUnique({
    where: { tenantId_code: { tenantId, code } },
  })
  if (!row) {
    throw new Error('Promo code not found')
  }
  if (!row.active) {
    throw new Error('Promo code is inactive')
  }
  if (row.expiresAt != null && row.expiresAt <= new Date()) {
    throw new Error('Promo code expired')
  }
  if (row.maxUses != null && row.usesCount >= row.maxUses) {
    throw new Error('Promo code limit reached')
  }

  const discountCents = computeDiscountCents(
    row.discountType,
    row.discountValue,
    subtotalCents,
  )

  return {
    code: row.code,
    description: row.description,
    discountType: row.discountType,
    discountValue: row.discountValue,
    discountCents,
  }
}
