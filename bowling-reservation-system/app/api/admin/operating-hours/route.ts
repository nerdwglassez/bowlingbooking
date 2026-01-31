import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const operatingHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  openTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  closeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  isClosed: z.boolean(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const hours = await prisma.operatingHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    })

    return NextResponse.json({ hours })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get operating hours error:', error)
    return NextResponse.json(
      { error: 'Failed to get operating hours' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const body = await request.json()
    const validatedData = operatingHoursSchema.parse(body)

    // Check if record exists
    const existing = await prisma.operatingHours.findUnique({
      where: { dayOfWeek: validatedData.dayOfWeek },
    })

    let hours
    if (existing) {
      // Update existing
      hours = await prisma.operatingHours.update({
        where: { dayOfWeek: validatedData.dayOfWeek },
        data: {
          openTime: validatedData.isClosed ? null : validatedData.openTime,
          closeTime: validatedData.isClosed ? null : validatedData.closeTime,
          isClosed: validatedData.isClosed,
        },
      })
    } else {
      // Create new
      hours = await prisma.operatingHours.create({
        data: {
          dayOfWeek: validatedData.dayOfWeek,
          openTime: validatedData.isClosed ? null : validatedData.openTime,
          closeTime: validatedData.isClosed ? null : validatedData.closeTime,
          isClosed: validatedData.isClosed,
        },
      })
    }

    return NextResponse.json({ hours })
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
    console.error('Update operating hours error:', error)
    return NextResponse.json(
      { error: 'Failed to update operating hours' },
      { status: 500 }
    )
  }
}


