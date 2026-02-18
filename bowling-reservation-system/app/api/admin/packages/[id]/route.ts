import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['FOOD', 'PARTY', 'DRINK', 'COMBO', 'ARCADE']),
  isActive: z.boolean(),
  imageUrl: z.string().max(500).nullable().optional(),
  durationMinutes: z.number().int().min(0).nullable().optional(),
  baseGuestCount: z.number().int().min(0).nullable().optional(),
  maxCapacity: z.number().int().min(0).nullable().optional(),
  pricePerExtraGuest: z.number().min(0).nullable().optional(),
  pricePerExtraLane: z.number().min(0).nullable().optional(),
  featured: z.boolean().optional(),
  displayOrder: z.number().int().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('ADMIN')
    const { id } = await params

    const pkg = await prisma.package.findUnique({
      where: { id },
    })

    if (!pkg) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ package: pkg })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get package error:', error)
    return NextResponse.json(
      { error: 'Failed to get package' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('ADMIN')
    const { id } = await params

    const body = await request.json()
    const validatedData = packageSchema.parse(body)

    const pkg = await prisma.package.update({
      where: { id },
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

    return NextResponse.json({ package: pkg })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }
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
    console.error('Update package error:', error)
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth('ADMIN')
    const { id } = await params

    // Check if package is used in any bookings
    const bookingPackages = await prisma.bookingPackage.findFirst({
      where: { packageId: id },
    })

    if (bookingPackages) {
      // Soft delete - just deactivate instead of deleting
      const pkg = await prisma.package.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        package: pkg,
        message: 'Package deactivated (cannot delete packages with existing bookings)',
      })
    }

    // Hard delete if no bookings exist
    const pkg = await prisma.package.delete({
      where: { id },
    })

    return NextResponse.json({ package: pkg, message: 'Package deleted' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Delete package error:', error)
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    )
  }
}


