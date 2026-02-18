import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateCustomerSchema = z.object({
  firstName: z.string().trim().min(0).max(100).optional(),
  lastName: z.string().trim().min(0).max(100).optional(),
  email: z.string().email('Invalid email').optional(),
  tier: z.enum(['REGULAR', 'VIP']).optional(),
  tierDiscount: z.number().min(0).max(100).nullable().optional(),
})

/** GET: fetch a customer (staff/manager/admin). PATCH: update tier/tierDiscount. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('STAFF')
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id, role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        tier: true,
        tierDiscount: true,
        newsletterOptIn: true,
        createdAt: true,
        bookings: {
          take: 10,
          orderBy: { date: 'desc' },
          select: { id: true, date: true, startTime: true, status: true, totalPrice: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({
      customer: {
        ...user,
        tierDiscount: user.tierDiscount != null ? Number(user.tierDiscount) : null,
      },
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get customer error:', error)
    return NextResponse.json(
      { error: 'Failed to get customer' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('STAFF')
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id, role: 'CUSTOMER' },
    })

    if (!user) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateCustomerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (parsed.data.email !== undefined && parsed.data.email !== user.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: parsed.data.email },
        select: { id: true },
      })
      if (emailTaken && emailTaken.id !== id) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
      }
    }

    const updateData: {
      firstName?: string
      lastName?: string
      email?: string
      tier?: string
      tierDiscount?: number | null
    } = {}
    if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName || null
    if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName || null
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email
    if (parsed.data.tier !== undefined) updateData.tier = parsed.data.tier
    if (parsed.data.tierDiscount !== undefined) updateData.tierDiscount = parsed.data.tierDiscount

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        tier: true,
        tierDiscount: true,
      },
    })

    return NextResponse.json({
      customer: {
        ...updated,
        tierDiscount: updated.tierDiscount != null ? Number(updated.tierDiscount) : null,
      },
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update customer error:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}
