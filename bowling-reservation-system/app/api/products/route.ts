import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/** Public: list active products (food/drink add-ons) for booking flow */
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type') // FOOD | DRINK
    const where: { isActive: boolean; type?: string } = { isActive: true }
    if (type === 'FOOD' || type === 'DRINK') where.type = type

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        type: p.type,
      })),
    })
  } catch (error: any) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    )
  }
}
