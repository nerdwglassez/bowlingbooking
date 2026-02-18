import { NextRequest, NextResponse } from 'next/server'
import { getOptionalSession, requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { bookingCreateSchema } from '@/lib/validations'
import { isTimeSlotAvailable } from '@/lib/availability'
import { getPricingSettings } from '@/lib/settings'
import { sendBookingConfirmationEmail } from '@/lib/email'
import {
  getLoyaltySettings,
  redemptionDiscountDollars,
  maxRedeemablePoints,
  awardPointsForBooking,
  redeemPointsForBooking,
} from '@/lib/loyalty'
import { validateGiftCard, applyGiftCardToBooking } from '@/lib/gift-cards'
import { getStripeSecretKey } from '@/lib/stripe-config'
import { generateUniqueCheckInToken } from '@/lib/check-in-token'
import { parse } from 'date-fns'

async function calculateBookingPrice(
  duration: number, // in minutes
  numBowlers: number,
  shoeSizes: number[],
  packagePrices: number[], // in cents
  numLanes: number = 1,
  productTotalCents: number = 0
): Promise<number> {
  // Get pricing settings from database
  const pricing = await getPricingSettings()

  // Lane rental (convert minutes to hours, round up; multiple lanes = multiple rate)
  const hours = Math.ceil(duration / 60)
  const laneRentalCents = Math.round(pricing.laneRentalPerHour * 100 * hours * numLanes)
  const bowlerPriceCents = Math.round(numBowlers * (pricing.bowlerPricePerPerson || 0) * 100)

  // Shoe rentals (convert to cents)
  const shoeRentalsCents = Math.round(shoeSizes.length * pricing.shoeRental * 100)

  // Package prices (already in cents)
  const packageTotal = packagePrices.reduce((sum, price) => sum + price, 0)

  // Subtotal
  const subtotal = laneRentalCents + bowlerPriceCents + shoeRentalsCents + packageTotal + productTotalCents

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
        bookingProducts: {
          include: {
            product: true,
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
    const validatedData = bookingCreateSchema.parse(body)

    // Parse date
    const bookingDate = parse(validatedData.date, 'yyyy-MM-dd', new Date())

    // Check availability and get available lanes
    const availability = await isTimeSlotAvailable(
      bookingDate,
      validatedData.startTime,
      validatedData.duration
    )

    const numLanes = validatedData.numLanes ?? 1
    if (!availability.available || availability.availableLanes.length < numLanes) {
      return NextResponse.json(
        { error: numLanes > 1 ? `Need ${numLanes} lanes; selected time slot has insufficient availability` : 'Selected time slot is no longer available' },
        { status: 400 }
      )
    }

    // Assign lanes: prefer adjacent (next to one another); fallback to first N available
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

    // Get product prices if product items are included
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

    // Calculate total price (lane rental scales with numLanes)
    let totalPriceCents = await calculateBookingPrice(
      validatedData.duration,
      validatedData.numBowlers,
      validatedData.shoeSizes || [],
      packagePrices,
      numLanes,
      productTotalCents
    )

    // Apply customer tier discount if set
    const bookingUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tierDiscount: true, loyaltyPoints: true },
    })
    if (bookingUser?.tierDiscount != null) {
      const discountPct = Number(bookingUser.tierDiscount)
      if (discountPct > 0 && discountPct <= 100) {
        totalPriceCents = Math.round(totalPriceCents * (1 - discountPct / 100))
      }
    }

    let loyaltyPointsRedeemed: number | null = null
    let loyaltyDiscountAmount: number | null = null
    const loyaltyPointsToRedeem = validatedData.loyaltyPointsToRedeem ?? 0
    if (loyaltyPointsToRedeem > 0 && bookingUser) {
      const loyaltySettings = await getLoyaltySettings()
      const totalDollars = totalPriceCents / 100
      const maxPoints = Math.min(
        bookingUser.loyaltyPoints,
        maxRedeemablePoints(totalDollars, loyaltySettings)
      )
      const pointsToUse = Math.min(loyaltyPointsToRedeem, maxPoints)
      if (pointsToUse >= loyaltySettings.minRedemptionPoints) {
        const discountDollars = redemptionDiscountDollars(pointsToUse, loyaltySettings)
        const discountCents = Math.round(discountDollars * 100)
        totalPriceCents = Math.max(0, totalPriceCents - discountCents)
        loyaltyPointsRedeemed = pointsToUse
        loyaltyDiscountAmount = discountDollars
      }
    }

    let giftCardId: string | null = null
    let giftCardAmountApplied: number | null = null
    const giftCardCode = validatedData.giftCardCode?.trim()
    const requestedGiftCardAmount = validatedData.giftCardAmountToApply ?? 0
    if (giftCardCode && requestedGiftCardAmount > 0) {
      try {
        const { id, balance } = await validateGiftCard(giftCardCode)
        const amountToApply = Math.min(requestedGiftCardAmount, balance, totalPriceCents / 100)
        if (amountToApply > 0) {
          giftCardId = id
          giftCardAmountApplied = amountToApply
          totalPriceCents = Math.max(0, totalPriceCents - Math.round(amountToApply * 100))
        }
      } catch (_) {
        return NextResponse.json(
          { error: 'Invalid gift card or insufficient balance' },
          { status: 400 }
        )
      }
    }

    const checkInToken = await generateUniqueCheckInToken((token) =>
      prisma.booking.findUnique({ where: { checkInToken: token }, select: { id: true } }).then((b) => !!b)
    )

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: session.userId,
        date: bookingDate,
        startTime: validatedData.startTime,
        duration: validatedData.duration,
        lane: assignedLane,
        lanes: numLanes > 1 ? JSON.stringify(assignedLanes) : null,
        numBowlers: validatedData.numBowlers,
        shoeSizes: validatedData.shoeSizes ? JSON.stringify(validatedData.shoeSizes) : null,
        status: 'PENDING',
        totalPrice: totalPriceCents / 100, // Convert cents to dollars
        loyaltyPointsRedeemed: loyaltyPointsRedeemed ?? undefined,
        loyaltyDiscountAmount: loyaltyDiscountAmount ?? undefined,
        giftCardId: giftCardId ?? undefined,
        giftCardAmountApplied: giftCardAmountApplied ?? undefined,
        checkInToken,
      },
    })

    // Create booking packages if any
    if (validatedData.packageIds && validatedData.packageIds.length > 0) {
      await prisma.bookingPackage.createMany({
        data: validatedData.packageIds.map((packageId: string) => ({
          bookingId: booking.id,
          packageId,
          quantity: 1,
        })),
      })
    }

    // Create booking products (individual food/drink items) if any
    if (productItems.length > 0) {
      await prisma.bookingProduct.createMany({
        data: productItems.map((item: { productId: string; quantity: number }) => ({
          bookingId: booking.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      })
    }

    // Fetch booking with packages and products
    const bookingWithPackages = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
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

    // If Stripe is not configured, booking is "confirmed" without payment — apply loyalty, send email
    const stripeSecret = await getStripeSecretKey()
    if (!stripeSecret && bookingWithPackages) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      })
      // Mark as PAID and apply loyalty (redeem + earn)
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PAID' },
      })
      if (loyaltyPointsRedeemed != null && loyaltyDiscountAmount != null) {
        await redeemPointsForBooking(
          session.userId,
          booking.id,
          loyaltyPointsRedeemed,
          loyaltyDiscountAmount
        )
      }
      await awardPointsForBooking(
        session.userId,
        booking.id,
        Number(bookingWithPackages.totalPrice)
      )
      if (booking.giftCardId != null && booking.giftCardAmountApplied != null) {
        await applyGiftCardToBooking(booking.giftCardId, Number(booking.giftCardAmountApplied))
      }
      if (user?.email) {
        const forEmail = {
          ...bookingWithPackages,
          totalPrice: Number(bookingWithPackages.totalPrice),
          lanes: bookingWithPackages.lanes ? (JSON.parse(bookingWithPackages.lanes) as number[]) : undefined,
          bookingPackages: bookingWithPackages.bookingPackages?.map((bp) => ({
            package: { name: bp.package.name, price: Number(bp.package.price) },
          })),
        }
        sendBookingConfirmationEmail(forEmail, user.email).catch((err) =>
          console.error('[bookings] Confirmation email failed:', err)
        )
      }
    }

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
