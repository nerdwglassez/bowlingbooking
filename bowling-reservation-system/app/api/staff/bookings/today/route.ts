import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'
import { normalizeBookingDateField, toJsonSafe } from '@/lib/prisma-json'
import { isNextRedirectError } from '@/lib/route-handler-errors'
import { format } from 'date-fns'

export async function GET(_request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const today = format(new Date(), 'yyyy-MM-dd')

    // Exclude cancelled from dashboard view; they remain in DB for reporting and contact history.
    // `omit` keeps Prisma from SELECTing columns that may not exist on DBs that have not applied
    // newer migrations (e.g. discount_codes / booking.discount_code_id) while still using the
    // same Prisma schema as fully migrated environments.
    const bookings = await prisma.booking.findMany({
      where: {
        date: new Date(today),
        status: {
          not: 'CANCELLED',
        },
      },
      omit: {
        discountCodeId: true,
        appliedDiscountCode: true,
        giftCardId: true,
        giftCardAmountApplied: true,
        loyaltyPointsRedeemed: true,
        loyaltyDiscountAmount: true,
        postVisitEmailSentAt: true,
        checkInToken: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        bookingPackages: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                type: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    const safe = toJsonSafe(bookings).map((b) => normalizeBookingDateField(b))
    return NextResponse.json({ bookings: safe, date: today })
  } catch (error: unknown) {
    if (isNextRedirectError(error)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get today bookings error:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2022') {
      return NextResponse.json(
        {
          error:
            'Database schema is behind the app (missing column(s) on bookings). Run `npx prisma migrate deploy` or `npm run db:push` for this DATABASE_URL.',
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to get today bookings' },
      { status: 500 }
    )
  }
}


