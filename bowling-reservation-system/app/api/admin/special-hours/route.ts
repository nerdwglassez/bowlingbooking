import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { parse, isValid, startOfDay, endOfDay } from 'date-fns'

/** Parse YYYY-MM-DD as local date (avoids UTC midnight offset). */
function parseLocalDate(dateStr: string): Date {
  const d = parse(dateStr, 'yyyy-MM-dd', new Date())
  if (!isValid(d)) throw new Error('Invalid date')
  return startOfDay(d)
}

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  closeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  isClosed: z.boolean(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const { searchParams } = request.nextUrl
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    const where: { date?: { gte?: Date; lte?: Date } } = {}
    if (fromParam) {
      where.date = { ...where.date, gte: parseLocalDate(fromParam) }
    }
    if (toParam) {
      where.date = { ...where.date, lte: endOfDay(parseLocalDate(toParam)) }
    }

    const hours = await prisma.specialHours.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ hours })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get special hours error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth('ADMIN')

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const date = parseLocalDate(parsed.data.date)

    if (!parsed.data.isClosed && (!parsed.data.openTime || !parsed.data.closeTime)) {
      return NextResponse.json(
        { error: 'Open and close time required when not closed' },
        { status: 400 }
      )
    }

    const special = await prisma.specialHours.upsert({
      where: { date },
      update: {
        openTime: parsed.data.isClosed ? null : parsed.data.openTime,
        closeTime: parsed.data.isClosed ? null : parsed.data.closeTime,
        isClosed: parsed.data.isClosed,
      },
      create: {
        date,
        openTime: parsed.data.isClosed ? null : parsed.data.openTime,
        closeTime: parsed.data.isClosed ? null : parsed.data.closeTime,
        isClosed: parsed.data.isClosed,
      },
    })

    return NextResponse.json({ special }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create/update special hours error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
