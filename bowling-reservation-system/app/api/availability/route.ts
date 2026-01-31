import { NextRequest, NextResponse } from 'next/server'
import { calculateAvailability } from '@/lib/availability'
import { parse, isValid } from 'date-fns'

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

    // Parse date (expecting YYYY-MM-DD format)
    const date = parse(dateParam, 'yyyy-MM-dd', new Date())

    if (!isValid(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const slots = await calculateAvailability(date)

    return NextResponse.json({
      date: dateParam,
      slots,
    })
  } catch (error: any) {
    console.error('Availability error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate availability', details: error.message },
      { status: 500 }
    )
  }
}

