import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

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

    let packages
    try {
      packages = await prisma.package.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (error) {
      // Backward-compatible fallback for local/dev DBs that have not applied
      // newer Package columns yet (e.g. image_url).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2022'
      ) {
        const whereClauses: Prisma.Sql[] = []
        if (activeOnly) whereClauses.push(Prisma.sql`is_active = true`)
        if (type) whereClauses.push(Prisma.sql`type = ${type}`)
        const whereSql =
          whereClauses.length > 0
            ? Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`
            : Prisma.empty

        const legacyPackages = await prisma.$queryRaw<
          Array<{
            id: string
            name: string
            description: string | null
            price: Prisma.Decimal
            type: string
            is_active: boolean
            created_at: Date
            updated_at: Date
          }>
        >(Prisma.sql`
          SELECT id, name, description, price, type, is_active, created_at, updated_at
          FROM packages
          ${whereSql}
          ORDER BY created_at DESC
        `)

        packages = legacyPackages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          type: pkg.type,
          isActive: pkg.is_active,
          imageUrl: null,
          durationMinutes: null,
          baseGuestCount: null,
          maxCapacity: null,
          pricePerExtraGuest: null,
          pricePerExtraLane: null,
          featured: false,
          displayOrder: null,
          createdAt: pkg.created_at,
          updatedAt: pkg.updated_at,
        }))
      } else {
        throw error
      }
    }

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Get packages error:', error)
    return NextResponse.json(
      { error: 'Failed to get packages' },
      { status: 500 }
    )
  }
}
