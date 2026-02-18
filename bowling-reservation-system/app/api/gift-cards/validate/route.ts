import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { validateGiftCard } from '@/lib/gift-cards'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limiter = checkRateLimit(rateLimitKey(request, 'gift-card-validate'), 30, 60_000)
    if (!limiter.allowed) {
      return NextResponse.json(
        { valid: false, error: 'Too many attempts. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSeconds) } }
      )
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }
    const { balance } = await validateGiftCard(code)
    return NextResponse.json({ valid: true, balance })
  } catch (e: any) {
    return NextResponse.json(
      { valid: false, error: e.message || 'Invalid gift card' },
      { status: 200 }
    )
  }
}
