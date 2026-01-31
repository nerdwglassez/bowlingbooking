import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const where: any = {}
    if (activeOnly) {
      where.isActive = true
    }
    if (type) {
      where.type = type
    }

    const packages = await prisma.package.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Get packages error:', error)
    return NextResponse.json(
      { error: 'Failed to get packages' },
      { status: 500 }
    )
  }
}
