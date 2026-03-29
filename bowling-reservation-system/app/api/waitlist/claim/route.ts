import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Wait list claim links are no longer available.' },
    { status: 410 }
  )
}
