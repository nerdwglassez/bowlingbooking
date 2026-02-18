import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLoyaltySettings, getTierFromPoints, maxRedeemablePoints } from '@/lib/loyalty'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { loyaltyPoints: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    // Only customers get loyalty (staff/manager/admin don't earn/use points in customer flow)
    if (user.role !== 'CUSTOMER') {
      return NextResponse.json({
        balance: 0,
        tier: 'Bronze',
        pointsPerDollar: 0,
        minRedemptionPoints: 0,
        redemptionCentsPer100Points: 0,
        maxRedeemable: 0,
        recentTransactions: [],
      })
    }

    const settings = await getLoyaltySettings()
    const balance = user.loyaltyPoints
    const tier = getTierFromPoints(balance)
    const totalParam = request.nextUrl.searchParams.get('total')
    const totalDollars = totalParam != null ? parseFloat(totalParam) : null
    const maxRedeemable =
      totalDollars != null && !Number.isNaN(totalDollars)
        ? Math.min(balance, maxRedeemablePoints(totalDollars, settings))
        : null

    const recentTransactions = await prisma.loyaltyTransaction.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      balance,
      tier,
      pointsPerDollar: settings.pointsPerDollar,
      minRedemptionPoints: settings.minRedemptionPoints,
      redemptionCentsPer100Points: settings.redemptionCentsPer100Points,
      maxRedeemable,
      recentTransactions: recentTransactions.map((t) => ({
        amount: t.amount,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('GET /api/loyalty:', error)
    return NextResponse.json({ error: 'Failed to load loyalty' }, { status: 500 })
  }
}
