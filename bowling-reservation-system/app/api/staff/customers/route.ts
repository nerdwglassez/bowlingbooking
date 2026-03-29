import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createCustomerSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().trim().min(0).max(100).optional(),
  lastName: z.string().trim().min(0).max(100).optional(),
  phone: z.string().trim().min(0).max(30).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Search by name, email, or phone
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        tier: true,
        tierDiscount: true,
        createdAt: true,
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            date: true,
            startTime: true,
            status: true,
          },
        },
      },
      take: 20,
    })

    return NextResponse.json({ customers })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Search customers error:', error)
    return NextResponse.json(
      { error: 'Failed to search customers' },
      { status: 500 }
    )
  }
}

/** POST: create a new customer (staff/manager/admin). Used when adding a walk-in with no account. */
export async function POST(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const body = await request.json()
    const parsed = createCustomerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        bookings: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, date: true, startTime: true, status: true } },
      },
    })
    if (existing) {
      if (existing.role === 'CUSTOMER') {
        return NextResponse.json({
          customer: {
            id: existing.id,
            email: existing.email,
            firstName: existing.firstName,
            lastName: existing.lastName,
            phone: existing.phone,
            createdAt: existing.createdAt.toISOString(),
            bookings: existing.bookings,
          },
        })
      }
      return NextResponse.json(
        { error: 'Email is already in use by another account' },
        { status: 409 }
      )
    }

    const randomPassword = crypto.randomUUID()
    const passwordHash = await hashPassword(randomPassword)
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        role: 'CUSTOMER',
        firstName: parsed.data.firstName || null,
        lastName: parsed.data.lastName || null,
        phone: parsed.data.phone || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      customer: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        bookings: [],
      },
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create customer error:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}


