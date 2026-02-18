import { NextRequest, NextResponse } from 'next/server'
import { calculateAvailability } from '@/lib/availability'
import { parse, isValid, startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    // Parse date (expecting YYYY-MM-DD format) and normalize to start of day for DB queries
    const parsed = parse(dateParam, 'yyyy-MM-dd', new Date())
    if (!isValid(parsed)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    const date = startOfDay(parsed)

    const slots = await calculateAvailability(date)
    return NextResponse.json({
      date: dateParam,
      slots,
    })
  } catch (error: unknown) {
    console.error('Availability error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? `Unable to load time slots: ${message}`
            : 'Unable to load time slots. Please try again.',
      },
      { status: 500 }
    )
  }
}

