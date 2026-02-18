import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addWeeks, startOfDay, setDay, isBefore, isAfter } from 'date-fns'

const DEFAULT_WEEKS = 8

/**
 * Generate LaneBlock occurrences from a RecurringLaneBlock for the next N weeks.
 * POST ?weeks=8 (default)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth('ADMIN')
    const { id } = await params

    const recurring = await prisma.recurringLaneBlock.findUnique({
      where: { id },
    })

    if (!recurring) {
      return NextResponse.json({ error: 'Recurring block not found' }, { status: 404 })
    }

    const { searchParams } = request.nextUrl
    const weeks = Math.min(26, Math.max(1, parseInt(searchParams.get('weeks') || String(DEFAULT_WEEKS), 10) || DEFAULT_WEEKS))

    const today = startOfDay(new Date())
    if (recurring.endDate && isBefore(recurring.endDate, today)) {
      return NextResponse.json({ generated: 0, message: 'Recurring block end date is in the past' })
    }
    const endDateLimit = recurring.endDate ?? null

    // Next occurrence of dayOfWeek (0=Sun .. 6=Sat)
    let date = setDay(today, recurring.dayOfWeek, { weekStartsOn: 0 })
    if (isBefore(date, today)) {
      date = addWeeks(date, 1) // move to next week's occurrence
    }

    const intervalWeeks = recurring.recurrence === 'BIWEEKLY' ? 2 : 1
    const endLimit = addWeeks(today, weeks)
    const created: string[] = []

    while (isBefore(date, endLimit)) {
      if (endDateLimit && isAfter(date, endDateLimit)) break

      const existing = await prisma.laneBlock.findFirst({
        where: {
          date,
          startTime: recurring.startTime,
          endTime: recurring.endTime,
          lanes: recurring.lanes,
        },
      })
      if (!existing) {
        const block = await prisma.laneBlock.create({
          data: {
            date,
            startTime: recurring.startTime,
            endTime: recurring.endTime,
            lanes: recurring.lanes,
            reason: recurring.reason,
            createdBy: session.userId,
          },
        })
        created.push(block.id)
      }

      date = addWeeks(date, intervalWeeks)
    }

    return NextResponse.json({ generated: created.length, ids: created })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Generate recurring blocks error:', error)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
