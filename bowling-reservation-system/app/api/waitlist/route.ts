import { NextResponse } from 'next/server'

const WAITLIST_DISABLED_RESPONSE = {
  error: 'Wait list is currently unavailable.',
}

export async function GET() {
  return NextResponse.json(WAITLIST_DISABLED_RESPONSE, { status: 410 })
}

export async function POST() {
  return NextResponse.json(WAITLIST_DISABLED_RESPONSE, { status: 410 })
}
