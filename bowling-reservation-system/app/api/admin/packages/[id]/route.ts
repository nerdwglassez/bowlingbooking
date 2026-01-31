import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const packageSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  price: z.number().min(0, 'Price must be positive'),
  type: z.enum(['FOOD', 'PARTY', 'DRINK', 'COMBO']),
  isActive: z.boolean(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth('ADMIN')

    const pkg = await prisma.package.findUnique({
      where: { id: params.id },
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
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth('ADMIN')

    const body = await request.json()
    const validatedData = packageSchema.parse(body)

    const pkg = await prisma.package.update({
      where: { id: params.id },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        price: validatedData.price,
        type: validatedData.type,
        isActive: validatedData.isActive,
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
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth('ADMIN')

    // Check if package is used in any bookings
    const bookingPackages = await prisma.bookingPackage.findFirst({
      where: { packageId: params.id },
    })

    if (bookingPackages) {
      // Soft delete - just deactivate instead of deleting
      const pkg = await prisma.package.update({
        where: { id: params.id },
        data: { isActive: false },
      })
      return NextResponse.json({
        package: pkg,
        message: 'Package deactivated (cannot delete packages with existing bookings)',
      })
    }

    // Hard delete if no bookings exist
    const pkg = await prisma.package.delete({
      where: { id: params.id },
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


