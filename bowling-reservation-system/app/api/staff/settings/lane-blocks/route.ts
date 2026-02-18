import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPricingSettings } from '@/lib/settings'
import { z } from 'zod'
import { parse, isValid, startOfDay, addDays } from 'date-fns'

const blockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  lanes: z.array(z.number().int().min(1)).min(1),
  reason: z.string().min(1),
})

function canManageSettings(role: string): boolean {
  return role === 'MANAGER' || role === 'ADMIN'
}

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { message?: string; digest?: string }
  return Boolean(
    maybeError.message?.includes('redirect') ||
      maybeError.message?.includes('NEXT_REDIRECT') ||
      maybeError.digest?.includes('NEXT_REDIRECT')
  )
}

function parseLocalDate(dateStr: string): Date {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) throw new Error('Invalid date')
  return startOfDay(d)
}

function enumerateDates(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  let cursor = start
  while (cursor <= end) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')
    const from = request.nextUrl.searchParams.get('from')
    const to = request.nextUrl.searchParams.get('to')

    const where: { date?: { gte?: Date; lte?: Date } } = {}
    if (from) where.date = { ...where.date, gte: parseLocalDate(from) }
    if (to) where.date = { ...where.date, lte: parseLocalDate(to) }

    const blocks = await prisma.laneBlock.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: 300,
    })

    return NextResponse.json({
      blocks: blocks.map((b) => ({ ...b, lanes: JSON.parse(b.lanes) as number[] })),
    })
  } catch (error: any) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get staff lane blocks error:', error)
    return NextResponse.json({ error: 'Failed to load lane blocks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('STAFF')
    if (!canManageSettings(session.role)) {
      return NextResponse.json({ error: 'Read-only access' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = blockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const [startHour, startMin] = parsed.data.startTime.split(':').map(Number)
    const [endHour, endMin] = parsed.data.endTime.split(':').map(Number)
    if (endHour * 60 + endMin <= startHour * 60 + startMin) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
    }

    const settings = await getPricingSettings()
    if (parsed.data.lanes.some((lane) => lane > settings.totalLanes)) {
      return NextResponse.json(
        { error: `Lane number exceeds total configured lanes (${settings.totalLanes})` },
        { status: 400 }
      )
    }

    const dates = parsed.data.date
      ? [parseLocalDate(parsed.data.date)]
      : parsed.data.startDate && parsed.data.endDate
        ? enumerateDates(parseLocalDate(parsed.data.startDate), parseLocalDate(parsed.data.endDate))
        : []

    if (dates.length === 0) {
      return NextResponse.json(
        { error: 'Provide either a single date, or both start and end date' },
        { status: 400 }
      )
    }
    if (dates.length > 60) {
      return NextResponse.json({ error: 'Date range is too large (max 60 days)' }, { status: 400 })
    }

    const created = await Promise.all(
      dates.map((date) =>
        prisma.laneBlock.create({
          data: {
            date,
            startTime: parsed.data.startTime,
            endTime: parsed.data.endTime,
            lanes: JSON.stringify(parsed.data.lanes),
            reason: parsed.data.reason,
            createdBy: session.userId,
          },
        })
      )
    )

    return NextResponse.json({
      blocks: created.map((b) => ({ ...b, lanes: JSON.parse(b.lanes) as number[] })),
    })
  } catch (error: any) {
    if (isRedirectError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create staff lane blocks error:', error)
    return NextResponse.json({ error: 'Failed to create lane blocks' }, { status: 500 })
  }
}
