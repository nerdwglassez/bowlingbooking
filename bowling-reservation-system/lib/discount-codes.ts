import type { DiscountCode, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'

export function normalizeDiscountCode(raw: string): string {
  return raw.replace(/\s/g, '').toUpperCase()
}

export type DiscountCodeRow = Pick<
  DiscountCode,
  | 'id'
  | 'code'
  | 'label'
  | 'paymentMode'
  | 'discountPercent'
  | 'discountFixedAmount'
  | 'maxRedemptions'
  | 'redemptionCount'
  | 'expiresAt'
  | 'isActive'
>

export function assertDiscountCodeUsable(code: DiscountCodeRow): void {
  if (!code.isActive) {
    throw new Error('This discount code is not active')
  }
  if (code.expiresAt && code.expiresAt < new Date()) {
    throw new Error('This discount code has expired')
  }
  if (code.maxRedemptions != null && code.redemptionCount >= code.maxRedemptions) {
    throw new Error('This discount code has reached its maximum number of uses')
  }
}

/**
 * Apply percent first (if set), then fixed amount (if set). Result is at least 0 cents.
 */
export function applyDiscountToCents(totalCents: number, code: DiscountCodeRow): number {
  let cents = totalCents
  if (code.discountPercent != null) {
    const pct = Number(code.discountPercent)
    if (pct > 0 && pct <= 100) {
      cents = Math.round(cents * (1 - pct / 100))
    }
  }
  if (code.discountFixedAmount != null) {
    const fixedCents = Math.round(Number(code.discountFixedAmount) * 100)
    cents = Math.max(0, cents - fixedCents)
  }
  return cents
}

export async function findDiscountCodeByNormalized(
  normalized: string
): Promise<DiscountCodeRow | null> {
  if (!normalized) return null
  return prisma.discountCode.findUnique({
    where: { code: normalized },
    select: {
      id: true,
      code: true,
      label: true,
      paymentMode: true,
      discountPercent: true,
      discountFixedAmount: true,
      maxRedemptions: true,
      redemptionCount: true,
      expiresAt: true,
      isActive: true,
    },
  })
}

export async function incrementDiscountRedemption(
  tx: Prisma.TransactionClient,
  codeId: string
): Promise<void> {
  await tx.discountCode.update({
    where: { id: codeId },
    data: { redemptionCount: { increment: 1 } },
  })
}

export function describeDiscountForPreview(code: DiscountCodeRow): string {
  const parts: string[] = []
  if (code.discountPercent != null && Number(code.discountPercent) > 0) {
    parts.push(`${Number(code.discountPercent)}% off`)
  }
  if (code.discountFixedAmount != null && Number(code.discountFixedAmount) > 0) {
    parts.push(`$${Number(code.discountFixedAmount).toFixed(2)} off`)
  }
  if (parts.length === 0) {
    return code.paymentMode === 'INVOICE' ? 'Invoice checkout' : 'Code applied'
  }
  return parts.join(', ')
}
