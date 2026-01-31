import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const laneBlockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  lanes: z.array(z.number().min(1).max(20)),
  reason: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')

    const where: any = {}
    if (dateParam) {
      where.date = new Date(dateParam)
    }

    const blocks = await prisma.laneBlock.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    // Parse lanes JSON for each block
    const blocksWithParsedLanes = blocks.map(block => ({
      ...block,
      lanes: JSON.parse(block.lanes),
    }))

    return NextResponse.json({ blocks: blocksWithParsedLanes })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get lane blocks error:', error)
    return NextResponse.json(
      { error: 'Failed to get lane blocks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('ADMIN')

    const body = await request.json()
    const validatedData = laneBlockSchema.parse(body)

    // Validate that endTime is after startTime
    const [startHour, startMin] = validatedData.startTime.split(':').map(Number)
    const [endHour, endMin] = validatedData.endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    const block = await prisma.laneBlock.create({
      data: {
        date: new Date(validatedData.date),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        lanes: JSON.stringify(validatedData.lanes),
        reason: validatedData.reason,
        createdBy: session.userId,
      },
    })

    return NextResponse.json(
      {
        block: {
          ...block,
          lanes: JSON.parse(block.lanes),
        },
      },
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
    console.error('Create lane block error:', error)
    return NextResponse.json(
      { error: 'Failed to create lane block' },
      { status: 500 }
    )
  }
}


