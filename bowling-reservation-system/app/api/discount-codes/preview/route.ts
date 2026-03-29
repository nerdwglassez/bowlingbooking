import { NextRequest, NextResponse } from 'next/server'
import { getOptionalSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  assertDiscountCodeUsable,
  applyDiscountToCents,
  describeDiscountForPreview,
  findDiscountCodeByNormalized,
  normalizeDiscountCode,
} from '@/lib/discount-codes'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

const previewSchema = z.object({
  code: z.string().min(1).max(40),
  /** Optional subtotal in cents (after tier discount) to preview adjusted total. */
  totalCentsBeforeCode: z.number().int().min(0).optional(),
})

/**
 * POST /api/discount-codes/preview
 * Validates a code for the booking flow. Requires a session (signed-in or guest).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getOptionalSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Please sign in or continue as guest before applying a code' },
        { status: 401 }
      )
    }

    const limiter = checkRateLimit(
      rateLimitKey(request, 'discount-preview', session.userId),
      60,
      60_000
    )
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: 'Too many code checks. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const parsed = previewSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
    }

    const { code, totalCentsBeforeCode } = parsed.data
    const normalized = normalizeDiscountCode(code)
    const row = await findDiscountCodeByNormalized(normalized)
    if (!row) {
      return NextResponse.json({ valid: false, error: 'Invalid discount code' }, { status: 200 })
    }

    try {
      assertDiscountCodeUsable(row)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Discount code is not valid'
      return NextResponse.json({ valid: false, error: msg }, { status: 200 })
    }

    let adjustedTotalCents: number | null = null
    if (totalCentsBeforeCode != null) {
      let cents = totalCentsBeforeCode
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { tierDiscount: true },
      })
      if (user?.tierDiscount != null) {
        const discountPct = Number(user.tierDiscount)
        if (discountPct > 0 && discountPct <= 100) {
          cents = Math.round(cents * (1 - discountPct / 100))
        }
      }
      adjustedTotalCents = applyDiscountToCents(cents, row)
    }

    return NextResponse.json({
      valid: true,
      paymentMode: row.paymentMode,
      description: describeDiscountForPreview(row),
      adjustedTotalCents,
      adjustedTotal:
        adjustedTotalCents != null ? Math.round(adjustedTotalCents) / 100 : null,
    })
  } catch (e: unknown) {
    console.error('[discount-codes/preview]', e)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
