import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parse, isValid, startOfDay } from 'date-fns'

/** Parse YYYY-MM-DD as local date (avoids UTC midnight offset). */
function parseLocalDate(dateStr: string): Date {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) throw new Error('Invalid date')
  return startOfDay(d)
}

const createSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  lanes: z.array(z.number().min(1).max(20)),
  reason: z.string().min(1),
  recurrence: z.enum(['WEEKLY', 'BIWEEKLY']),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET() {
  try {
    await requireAuth('ADMIN')

    const blocks = await prisma.recurringLaneBlock.findMany({
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    const withParsedLanes = blocks.map((b) => ({
      ...b,
      lanes: JSON.parse(b.lanes) as number[],
    }))

    return NextResponse.json({ blocks: withParsedLanes })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get recurring blocks error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('ADMIN')

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const [startH, startM] = parsed.data.startTime.split(':').map(Number)
    const [endH, endM] = parsed.data.endTime.split(':').map(Number)
    if (endH * 60 + endM <= startH * 60 + startM) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    const block = await prisma.recurringLaneBlock.create({
      data: {
        dayOfWeek: parsed.data.dayOfWeek,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        lanes: JSON.stringify(parsed.data.lanes),
        reason: parsed.data.reason,
        recurrence: parsed.data.recurrence,
        endDate: parsed.data.endDate ? parseLocalDate(parsed.data.endDate) : null,
        createdBy: session.userId,
      },
    })

    return NextResponse.json({
      block: { ...block, lanes: JSON.parse(block.lanes) },
    }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create recurring block error:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
