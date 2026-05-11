import type { DiscountCode, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'

export class DiscountCodeRedemptionError extends Error {
  constructor(message = 'This discount code is no longer available') {
    super(message)
    this.name = 'DiscountCodeRedemptionError'
  }
}

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
  const now = new Date()
  const updatedRows = await tx.$executeRaw`
    UPDATE "discount_codes"
    SET
      "redemption_count" = "redemption_count" + 1,
      "updated_at" = CURRENT_TIMESTAMP
    WHERE
      "id" = ${codeId}
      AND "is_active" = true
      AND ("expires_at" IS NULL OR "expires_at" >= ${now})
      AND ("max_redemptions" IS NULL OR "redemption_count" < "max_redemptions")
  `

  if (updatedRows !== 1) {
    throw new DiscountCodeRedemptionError()
  }
}

/** Plain JSON shape for API responses (Prisma `Decimal` fields are not JSON-serializable). */
export type DiscountCodeJson = {
  id: string
  code: string
  label: string | null
  paymentMode: DiscountCode['paymentMode']
  discountPercent: number | null
  discountFixedAmount: number | null
  maxRedemptions: number | null
  redemptionCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export function discountCodeToJson(code: DiscountCode): DiscountCodeJson {
  return {
    id: code.id,
    code: code.code,
    label: code.label,
    paymentMode: code.paymentMode,
    discountPercent: code.discountPercent != null ? Number(code.discountPercent) : null,
    discountFixedAmount: code.discountFixedAmount != null ? Number(code.discountFixedAmount) : null,
    maxRedemptions: code.maxRedemptions,
    redemptionCount: code.redemptionCount,
    expiresAt: code.expiresAt?.toISOString() ?? null,
    isActive: code.isActive,
    createdAt: code.createdAt.toISOString(),
  }
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
