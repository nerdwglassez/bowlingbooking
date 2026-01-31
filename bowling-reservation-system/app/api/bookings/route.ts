import { NextRequest, NextResponse } from 'next/server'
import { getOptionalSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { bookingSchema } from '@/lib/validations'
import { isTimeSlotAvailable } from '@/lib/availability'
import { getPricingSettings } from '@/lib/settings'
import { parse } from 'date-fns'

async function calculateBookingPrice(
  duration: number, // in minutes
  numBowlers: number,
  shoeSizes: number[],
  packagePrices: number[] // in cents
): Promise<number> {
  // Get pricing settings from database
  const pricing = await getPricingSettings()

  // Lane rental (convert minutes to hours, round up)
  const hours = Math.ceil(duration / 60)
  const laneRentalCents = Math.round(pricing.laneRentalPerHour * 100 * hours)

  // Shoe rentals (convert to cents)
  const shoeRentalsCents = Math.round(shoeSizes.length * pricing.shoeRental * 100)

  // Package prices (already in cents)
  const packageTotal = packagePrices.reduce((sum, price) => sum + price, 0)

  // Subtotal
  const subtotal = laneRentalCents + shoeRentalsCents + packageTotal

  // Tax
  const tax = Math.round(subtotal * pricing.taxRate)

  // Total
  return subtotal + tax
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const where: any = {
      userId: session.userId,
    }

    if (status) {
      where.status = status
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        bookingPackages: {
          include: {
            package: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json({ bookings })
  } catch (error: any) {
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to get bookings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session (optional for guest checkout - they should have session from guest registration)
    const session = await getOptionalSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Please sign in or continue as guest to complete your booking' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = bookingSchema.parse(body)

    // Parse date
    const bookingDate = parse(validatedData.date, 'yyyy-MM-dd', new Date())

    // Check availability and get available lanes
    const availability = await isTimeSlotAvailable(
      bookingDate,
      validatedData.startTime,
      validatedData.duration
    )

    if (!availability.available || availability.availableLanes.length === 0) {
      return NextResponse.json(
        { error: 'Selected time slot is no longer available' },
        { status: 400 }
      )
    }

    // If specific lane requested, verify it's available
    // Otherwise, assign first available lane
    let assignedLane: number
    if (validatedData.lane) {
      if (!availability.availableLanes.includes(validatedData.lane)) {
        return NextResponse.json(
          { error: 'Selected lane is not available for this time slot' },
          { status: 400 }
        )
      }
      assignedLane = validatedData.lane
    } else {
      assignedLane = availability.availableLanes[0] // Assign first available lane
    }

    // Get package prices if packages are included
    let packagePrices: number[] = []
    if (validatedData.packageIds && validatedData.packageIds.length > 0) {
      const packages = await prisma.package.findMany({
        where: {
          id: { in: validatedData.packageIds },
          isActive: true,
        },
      })
      packagePrices = packages.map(pkg => Number(pkg.price) * 100) // Convert to cents
    }

    // Calculate total price
    const totalPriceCents = await calculateBookingPrice(
      validatedData.duration,
      validatedData.numBowlers,
      validatedData.shoeSizes || [],
      packagePrices
    )

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: session.userId,
        date: bookingDate,
        startTime: validatedData.startTime,
        duration: validatedData.duration,
        lane: assignedLane,
        numBowlers: validatedData.numBowlers,
        shoeSizes: validatedData.shoeSizes ? JSON.stringify(validatedData.shoeSizes) : null,
        status: 'PENDING',
        totalPrice: totalPriceCents / 100, // Convert cents to dollars
      },
    })

    // Create booking packages if any
    if (validatedData.packageIds && validatedData.packageIds.length > 0) {
      await prisma.bookingPackage.createMany({
        data: validatedData.packageIds.map(packageId => ({
          bookingId: booking.id,
          packageId,
          quantity: 1,
        })),
      })
    }

    // Fetch booking with packages
    const bookingWithPackages = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        bookingPackages: {
          include: {
            package: true,
          },
        },
      },
    })

    return NextResponse.json(
      { booking: bookingWithPackages },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    if (error.message?.includes('redirect')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.error('Create booking error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking', details: error.message },
      { status: 500 }
    )
  }
}
