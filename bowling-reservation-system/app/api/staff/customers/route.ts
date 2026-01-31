import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Search by name, email, or phone
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          // Note: We'd need to add phone/name fields to User model for full search
          // For now, just search by email
        ],
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        bookings: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            date: true,
            startTime: true,
            status: true,
          },
        },
      },
      take: 20,
    })

    return NextResponse.json({ customers })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Search customers error:', error)
    return NextResponse.json(
      { error: 'Failed to search customers' },
      { status: 500 }
    )
  }
}


