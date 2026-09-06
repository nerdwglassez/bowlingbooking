import { NextResponse } from 'next/server'

import { autocompleteAddress } from '@/lib/address-autocomplete'
import { getCurrentUser } from '@/lib/auth'
import {
  assertRateLimit,
  getClientIdFromHeaderValues,
  RateLimitExceededError,
} from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/address/autocomplete?q=8512+Two+Notch
 * ADMIN-only. Returns structured street suggestions for venue settings.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 3) {
    return NextResponse.json({ suggestions: [], provider: null })
  }
  if (q.length > 200) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 })
  }

  try {
    assertRateLimit(
      'address_autocomplete',
      getClientIdFromHeaderValues((name) => request.headers.get(name)),
    )
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: err.message },
        {
          status: 429,
          headers: { 'Retry-After': String(err.retryAfterSec) },
        },
      )
    }
    throw err
  }

  try {
    const result = await autocompleteAddress(q)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (err) {
    console.error('[address/autocomplete]', err)
    return NextResponse.json(
      { error: 'Address lookup unavailable' },
      { status: 502 },
    )
  }
}
