import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { normalizeDiscountCode } from '@/lib/discount-codes'
import { z } from 'zod'

const createSchema = z.object({
  code: z.string().min(3).max(32),
  label: z.string().max(120).optional().nullable(),
  paymentMode: z.enum(['ONLINE', 'INVOICE']),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  discountFixedAmount: z.number().min(0).optional().nullable(),
  maxRedemptions: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
})

export async function GET() {
  try {
    await requireAuth('ADMIN')
    const codes = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ codes })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('List discount codes error:', error)
    return NextResponse.json({ error: 'Failed to list codes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth('ADMIN')
    const body = await request.json()
    const data = createSchema.parse(body)
    const normalized = normalizeDiscountCode(data.code)
    if (normalized.length < 3) {
      return NextResponse.json({ error: 'Code must be at least 3 characters' }, { status: 400 })
    }

    const exists = await prisma.discountCode.findUnique({ where: { code: normalized } })
    if (exists) {
      return NextResponse.json({ error: 'A code with this value already exists' }, { status: 400 })
    }

    const code = await prisma.discountCode.create({
      data: {
        code: normalized,
        label: data.label ?? null,
        paymentMode: data.paymentMode,
        discountPercent:
          data.discountPercent != null && data.discountPercent > 0
            ? data.discountPercent
            : null,
        discountFixedAmount:
          data.discountFixedAmount != null && data.discountFixedAmount > 0
            ? data.discountFixedAmount
            : null,
        maxRedemptions: data.maxRedemptions ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive,
      },
    })

    return NextResponse.json({ code }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create discount code error:', error)
    return NextResponse.json({ error: 'Failed to create code' }, { status: 500 })
  }
}
