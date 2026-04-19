import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { bookingSchema } from '@/lib/validations'
import { isTimeSlotAvailable } from '@/lib/availability'
import { getPricingSettings } from '@/lib/settings'
import { parse } from 'date-fns'

async function calculateBookingPrice(
  duration: number,
  numBowlers: number,
  shoeSizes: number[],
  packagePrices: number[], // in cents
  numLanes: number = 1,
  productTotalCents: number = 0
): Promise<number> {
  // Get pricing settings from database
  const pricing = await getPricingSettings()

  const hours = Math.ceil(duration / 60)
  const laneRentalCents = Math.round(pricing.laneRentalPerHour * 100 * hours * numLanes)
  const bowlerPriceCents = Math.round(numBowlers * (pricing.bowlerPricePerPerson || 0) * 100)
  const shoeRentalsCents = Math.round(shoeSizes.length * pricing.shoeRental * 100)
  const packageTotal = packagePrices.reduce((sum, price) => sum + price, 0)
  const subtotal = laneRentalCents + bowlerPriceCents + shoeRentalsCents + packageTotal + productTotalCents
  const tax = Math.round(subtotal * pricing.taxRate)
  return subtotal + tax
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth('STAFF')

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: any = {}
    if (date) {
      where.date = new Date(date)
    }
    if (status) {
      where.status = status
    }

    const bookings = await prisma.booking.findMany({
      where,
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
            package: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
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
    console.error('Get staff bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to get bookings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth('STAFF')
    const body = await request.json()

    // For staff bookings, we need userId in the body
    const { userId, ...bookingData } = body
    const validatedData = bookingSchema.parse(bookingData)

    if (!userId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const customer = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!customer || customer.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Invalid customer' },
        { status: 400 }
      )
    }

    // Parse date
    const bookingDate = parse(validatedData.date, 'yyyy-MM-dd', new Date())

    // Check availability
    const availability = await isTimeSlotAvailable(
      bookingDate,
      validatedData.startTime,
      validatedData.duration
    )

    const numLanes = validatedData.numLanes ?? 1
    if (!availability.available || availability.availableLanes.length < numLanes) {
      return NextResponse.json(
        {
          error:
            numLanes > 1
              ? `Need ${numLanes} lanes; selected time slot has insufficient availability`
              : 'Selected time slot is no longer available',
        },
        { status: 400 }
      )
    }

    // Assign lanes: prefer adjacent lanes when multi-lane booking
    function pickAdjacentLanes(available: number[], count: number): number[] {
      if (count <= 0 || available.length < count) return available.slice(0, count)
      for (let i = 0; i <= available.length - count; i++) {
        const slice = available.slice(i, i + count)
        const isAdjacent = slice.every((lane, j) => j === 0 || lane === slice[j - 1] + 1)
        if (isAdjacent) return slice
      }
      return available.slice(0, count)
    }

    let assignedLanes: number[]
    if (numLanes === 1 && validatedData.lane) {
      if (!availability.availableLanes.includes(validatedData.lane)) {
        return NextResponse.json(
          { error: 'Selected lane is not available for this time slot' },
          { status: 400 }
        )
      }
      assignedLanes = [validatedData.lane]
    } else {
      assignedLanes = pickAdjacentLanes(availability.availableLanes, numLanes)
    }
    const assignedLane = assignedLanes[0]

    // Get package prices
    let packagePrices: number[] = []
    if (validatedData.packageIds && validatedData.packageIds.length > 0) {
      const packages = await prisma.package.findMany({
        where: {
          id: { in: validatedData.packageIds },
          isActive: true,
        },
      })
      packagePrices = packages.map(pkg => Number(pkg.price) * 100)
    }

    // Get product prices if products are included
    let productTotalCents = 0
    const productItems = validatedData.productItems || []
    if (productItems.length > 0) {
      const productIds = [...new Set(productItems.map((p: { productId: string }) => p.productId))]
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
      })
      const productMap = Object.fromEntries(products.map(p => [p.id, Number(p.price) * 100]))
      for (const item of productItems) {
        const priceCents = productMap[item.productId]
        if (priceCents != null) productTotalCents += priceCents * item.quantity
      }
    }

    // Calculate price
    const totalPriceCents = await calculateBookingPrice(
      validatedData.duration,
      validatedData.numBowlers,
      validatedData.shoeSizes || [],
      packagePrices,
      numLanes,
      productTotalCents
    )

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        date: bookingDate,
        startTime: validatedData.startTime,
        duration: validatedData.duration,
        lane: assignedLane,
        lanes: numLanes > 1 ? JSON.stringify(assignedLanes) : null,
        numBowlers: validatedData.numBowlers,
        shoeSizes: validatedData.shoeSizes ? JSON.stringify(validatedData.shoeSizes) : null,
        status: 'CONFIRMED', // Staff bookings are confirmed immediately
        totalPrice: totalPriceCents / 100,
      },
    })

    // Create booking packages
    if (validatedData.packageIds && validatedData.packageIds.length > 0) {
      await prisma.bookingPackage.createMany({
        data: validatedData.packageIds.map((packageId: string) => ({
          bookingId: booking.id,
          packageId,
          quantity: 1,
        })),
      })
    }

    // Create booking products
    if (productItems.length > 0) {
      await prisma.bookingProduct.createMany({
        data: productItems.map((item: { productId: string; quantity: number }) => ({
          bookingId: booking.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      })
    }

    // Fetch booking with packages
    const bookingWithPackages = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        bookingPackages: {
          include: {
            package: true,
          },
        },
        bookingProducts: {
          include: {
            product: true,
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
    console.error('Create staff booking error:', error)
    return NextResponse.json(
      { error: 'Failed to create booking', details: error.message },
      { status: 500 }
    )
  }
}

