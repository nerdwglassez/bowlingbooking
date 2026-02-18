import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/admin/pos-export
 * Stub: POS/lane management export. Returns 501 until vendor format is implemented.
 * See docs/POS_INTEGRATION.md.
 */
export async function GET() {
  try {
    await requireAuth('ADMIN')
    return NextResponse.json(
      {
        error: 'Not implemented',
        message: 'POS export is vendor-dependent. See docs/POS_INTEGRATION.md to implement.',
      },
      { status: 501 }
    )
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'message' in e && (e as { message: string }).message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
