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
import {
  applyDiscountToCents,
  assertDiscountCodeUsable,
  DISCOUNT_CODE_UNUSABLE_MESSAGE,
  findDiscountCodeByNormalized,
  incrementDiscountRedemption,
  normalizeDiscountCode,
  type DiscountCodeRow,
} from '@/lib/discount-codes'
import { parse } from 'date-fns'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'
import { normalizeBookingDateField, toJsonSafe } from '@/lib/prisma-json'
import { isNextRedirectError } from '@/lib/route-handler-errors'

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

    const safe = toJsonSafe(bookings).map((b) => normalizeBookingDateField(b))
    return NextResponse.json({ bookings: safe })
  } catch (error: unknown) {
    if (isNextRedirectError(error)) {
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

    const createLimit = checkRateLimit(
      rateLimitKey(request, 'booking-create', session.userId),
      25,
      3_600_000
    )
    if (!createLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(createLimit.retryAfterSeconds) } }
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

    let discountCodeRow: DiscountCodeRow | null = null
    let appliedDiscountCodeSnapshot: string | null = null
    const rawDiscountCode = validatedData.discountCode?.trim()
    if (rawDiscountCode) {
      const normalized = normalizeDiscountCode(rawDiscountCode)
      const codeRecord = await findDiscountCodeByNormalized(normalized)
      if (!codeRecord) {
        return NextResponse.json({ error: 'Invalid discount code' }, { status: 400 })
      }
      try {
        assertDiscountCodeUsable(codeRecord)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Discount code is not valid'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
      discountCodeRow = codeRecord
      appliedDiscountCodeSnapshot = codeRecord.code
      totalPriceCents = applyDiscountToCents(totalPriceCents, codeRecord)
    }

    const invoiceCheckout = discountCodeRow?.paymentMode === 'INVOICE'

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

    let initialStatus: 'PENDING' | 'CONFIRMED' | 'PAID' = 'PENDING'
    if (invoiceCheckout) {
      initialStatus = 'CONFIRMED'
    } else if (totalPriceCents <= 0) {
      initialStatus = 'PAID'
    }

    const bookingId = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          userId: session.userId,
          date: bookingDate,
          startTime: validatedData.startTime,
          duration: validatedData.duration,
          lane: assignedLane,
          lanes: numLanes > 1 ? JSON.stringify(assignedLanes) : null,
          numBowlers: validatedData.numBowlers,
          shoeSizes: validatedData.shoeSizes ? JSON.stringify(validatedData.shoeSizes) : null,
          status: initialStatus,
          totalPrice: totalPriceCents / 100,
          loyaltyPointsRedeemed: loyaltyPointsRedeemed ?? undefined,
          loyaltyDiscountAmount: loyaltyDiscountAmount ?? undefined,
          giftCardId: giftCardId ?? undefined,
          giftCardAmountApplied: giftCardAmountApplied ?? undefined,
          discountCodeId: discountCodeRow?.id,
          appliedDiscountCode: appliedDiscountCodeSnapshot ?? undefined,
          checkInToken,
        },
      })

      if (discountCodeRow) {
        await incrementDiscountRedemption(tx, discountCodeRow.id)
      }

      if (validatedData.packageIds && validatedData.packageIds.length > 0) {
        await tx.bookingPackage.createMany({
          data: validatedData.packageIds.map((packageId: string) => ({
            bookingId: booking.id,
            packageId,
            quantity: 1,
          })),
        })
      }

      if (productItems.length > 0) {
        await tx.bookingProduct.createMany({
          data: productItems.map((item: { productId: string; quantity: number }) => ({
            bookingId: booking.id,
            productId: item.productId,
            quantity: item.quantity,
          })),
        })
      }

      return booking.id
    })

    const bookingWithPackages = await prisma.booking.findUnique({
      where: { id: bookingId },
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

    const stripeSecret = await getStripeSecretKey()

    function buildEmailPayload() {
      if (!bookingWithPackages) return null
      return {
        ...bookingWithPackages,
        totalPrice: Number(bookingWithPackages.totalPrice),
        lanes: bookingWithPackages.lanes ? (JSON.parse(bookingWithPackages.lanes) as number[]) : undefined,
        bookingPackages: bookingWithPackages.bookingPackages?.map((bp) => ({
          package: { name: bp.package.name, price: Number(bp.package.price) },
        })),
      }
    }

    // Invoice checkout: confirmed without online payment; no loyalty points earned until paid (future)
    if (invoiceCheckout && bookingWithPackages) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      })
      if (loyaltyPointsRedeemed != null && loyaltyDiscountAmount != null) {
        await redeemPointsForBooking(
          session.userId,
          bookingWithPackages.id,
          loyaltyPointsRedeemed,
          loyaltyDiscountAmount
        )
      }
      if (bookingWithPackages.giftCardId != null && bookingWithPackages.giftCardAmountApplied != null) {
        await applyGiftCardToBooking(
          bookingWithPackages.giftCardId,
          Number(bookingWithPackages.giftCardAmountApplied)
        )
      }
      const forEmail = buildEmailPayload()
      if (forEmail && user?.email) {
        sendBookingConfirmationEmail(forEmail, user.email, { invoicePending: true }).catch((err) =>
          console.error('[bookings] Invoice booking email failed:', err)
        )
      }
    } else if (bookingWithPackages?.status === 'PAID' && !invoiceCheckout) {
      // $0 online checkout or equivalent
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      })
      if (loyaltyPointsRedeemed != null && loyaltyDiscountAmount != null) {
        await redeemPointsForBooking(
          session.userId,
          bookingWithPackages.id,
          loyaltyPointsRedeemed,
          loyaltyDiscountAmount
        )
      }
      await awardPointsForBooking(
        session.userId,
        bookingWithPackages.id,
        Number(bookingWithPackages.totalPrice)
      )
      if (bookingWithPackages.giftCardId != null && bookingWithPackages.giftCardAmountApplied != null) {
        await applyGiftCardToBooking(
          bookingWithPackages.giftCardId,
          Number(bookingWithPackages.giftCardAmountApplied)
        )
      }
      const forEmail = buildEmailPayload()
      if (forEmail && user?.email) {
        sendBookingConfirmationEmail(forEmail, user.email).catch((err) =>
          console.error('[bookings] Confirmation email failed:', err)
        )
      }
    } else if (!stripeSecret && bookingWithPackages && bookingWithPackages.status === 'PENDING') {
      // Dev / no Stripe: treat as paid after booking
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { email: true },
      })
      await prisma.booking.update({
        where: { id: bookingWithPackages.id },
        data: { status: 'PAID' },
      })
      if (loyaltyPointsRedeemed != null && loyaltyDiscountAmount != null) {
        await redeemPointsForBooking(
          session.userId,
          bookingWithPackages.id,
          loyaltyPointsRedeemed,
          loyaltyDiscountAmount
        )
      }
      await awardPointsForBooking(
        session.userId,
        bookingWithPackages.id,
        Number(bookingWithPackages.totalPrice)
      )
      if (bookingWithPackages.giftCardId != null && bookingWithPackages.giftCardAmountApplied != null) {
        await applyGiftCardToBooking(
          bookingWithPackages.giftCardId,
          Number(bookingWithPackages.giftCardAmountApplied)
        )
      }
      const forEmail = buildEmailPayload()
      if (forEmail && user?.email) {
        sendBookingConfirmationEmail(forEmail, user.email).catch((err) =>
          console.error('[bookings] Confirmation email failed:', err)
        )
      }
    }

    const finalBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingPackages: { include: { package: true } },
        bookingProducts: { include: { product: true } },
      },
    })

    const requiresPayment =
      !!finalBooking &&
      finalBooking.status === 'PENDING' &&
      !!stripeSecret &&
      Number(finalBooking.totalPrice) > 0

    return NextResponse.json(
      {
        booking: finalBooking,
        requiresPayment,
        checkoutType: invoiceCheckout ? 'invoice' : 'online',
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    if (error.message === DISCOUNT_CODE_UNUSABLE_MESSAGE) {
      return NextResponse.json(
        { error: error.message },
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
