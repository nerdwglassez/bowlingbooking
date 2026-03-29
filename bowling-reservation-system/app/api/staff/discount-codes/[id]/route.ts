import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  label: z.string().max(120).optional().nullable(),
  paymentMode: z.enum(['ONLINE', 'INVOICE']).optional(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  discountFixedAmount: z.number().min(0).optional().nullable(),
  maxRedemptions: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
})

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { message?: string; digest?: string }
  return Boolean(
    maybeError.message?.includes('redirect') ||
      maybeError.message?.includes('NEXT_REDIRECT') ||
      maybeError.digest?.includes('NEXT_REDIRECT')
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('STAFF')
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can update discount codes' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const existing = await prisma.discountCode.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const code = await prisma.discountCode.update({
      where: { id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.paymentMode !== undefined ? { paymentMode: data.paymentMode } : {}),
        ...(data.discountPercent !== undefined
          ? {
              discountPercent:
                data.discountPercent != null && data.discountPercent > 0
                  ? data.discountPercent
                  : null,
            }
          : {}),
        ...(data.discountFixedAmount !== undefined
          ? {
              discountFixedAmount:
                data.discountFixedAmount != null && data.discountFixedAmount > 0
                  ? data.discountFixedAmount
                  : null,
            }
          : {}),
        ...(data.maxRedemptions !== undefined ? { maxRedemptions: data.maxRedemptions } : {}),
        ...(data.expiresAt !== undefined
          ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    return NextResponse.json({ code })
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown }
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update staff discount code error:', error)
    return NextResponse.json({ error: 'Failed to update code' }, { status: 500 })
  }
}
