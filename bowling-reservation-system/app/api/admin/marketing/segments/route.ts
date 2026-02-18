import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { subDays } from 'date-fns'

/**
 * GET /api/admin/marketing/segments
 * Returns segment counts for marketing automation (admin only).
 */
export async function GET() {
  try {
    await requireAuth('ADMIN')

    const now = new Date()
    const lapsedCutoff = subDays(now, 30)

    const recentBookerIds = await prisma.booking
      .findMany({
        where: { date: { gte: lapsedCutoff }, status: { not: 'CANCELLED' } },
        select: { userId: true },
      })
      .then((rows) => [...new Set(rows.map((b) => b.userId))])

    const [postVisitPending, lapsedEligible] = await Promise.all([
      prisma.booking.count({
        where: {
          status: 'COMPLETED',
          postVisitEmailSentAt: null,
          date: { gte: subDays(now, 3) },
        },
      }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          newsletterOptIn: true,
          email: { not: '' },
          ...(recentBookerIds.length > 0 ? { id: { notIn: recentBookerIds } } : {}),
        },
      }),
    ])

    return NextResponse.json({
      postVisitPending,
      lapsedEligible,
      cronUrl: '/api/cron/marketing-automation',
    })
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'message' in e && (e as { message: string }).message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Marketing segments error:', e)
    return NextResponse.json({ error: 'Failed to load segments' }, { status: 500 })
  }
}
