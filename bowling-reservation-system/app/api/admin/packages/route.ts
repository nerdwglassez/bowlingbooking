import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['FOOD', 'PARTY', 'DRINK', 'COMBO', 'ARCADE']),
  isActive: z.boolean().default(true),
  imageUrl: z.string().max(500).nullable().optional(),
  durationMinutes: z.number().int().min(0).nullable().optional(),
  baseGuestCount: z.number().int().min(0).nullable().optional(),
  maxCapacity: z.number().int().min(0).nullable().optional(),
  pricePerExtraGuest: z.number().min(0).nullable().optional(),
  pricePerExtraLane: z.number().min(0).nullable().optional(),
  featured: z.boolean().default(false),
  displayOrder: z.number().int().nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('activeOnly') !== 'false'
    const type = searchParams.get('type')

    const where: any = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (type) {
      where.type = type
    }

    const packages = await prisma.package.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ packages })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get packages error:', error)
    return NextResponse.json(
      { error: 'Failed to get packages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const body = await request.json()
    const validatedData = packageSchema.parse(body)

    const pkg = await prisma.package.create({
      data: {
        name: validatedData.name,
        description: validatedData.description ?? null,
        price: validatedData.price,
        type: validatedData.type,
        isActive: validatedData.isActive,
        imageUrl: validatedData.imageUrl ?? null,
        durationMinutes: validatedData.durationMinutes ?? null,
        baseGuestCount: validatedData.baseGuestCount ?? null,
        maxCapacity: validatedData.maxCapacity ?? null,
        pricePerExtraGuest: validatedData.pricePerExtraGuest ?? null,
        pricePerExtraLane: validatedData.pricePerExtraLane ?? null,
        featured: validatedData.featured ?? false,
        displayOrder: validatedData.displayOrder ?? null,
      },
    })

    return NextResponse.json(
      { package: pkg },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Create package error:', error)
    return NextResponse.json(
      { error: 'Failed to create package' },
      { status: 500 }
    )
  }
}


