import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/** GET - Staff/manager/admin read-only. Query: ?action=, ?entityType=, ?entityId=, ?limit=50 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const { searchParams } = request.nextUrl
    const action = searchParams.get('action')
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10) || 50)

    const where: { action?: string; entityType?: string; entityId?: string } = {}
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId

    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({ entries })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get audit log error:', error)
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 })
  }
}
