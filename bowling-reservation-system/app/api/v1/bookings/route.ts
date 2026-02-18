import { NextRequest, NextResponse } from 'next/server'
import {
  validateApiKey,
  requireScope,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { isTimeSlotAvailable } from '@/lib/availability'
import { generateUniqueCheckInToken } from '@/lib/check-in-token'
import { getPricingSettings } from '@/lib/settings'
import { sendBookingConfirmationEmail } from '@/lib/email'
import { parse } from 'date-fns'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const v1BookingSchema = z.object({
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(10),
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  duration: z.number().min(60).max(180).refine((v) => [60, 90, 120, 150, 180].includes(v)),
  numLanes: z.number().min(1).max(5).optional(),
  numBowlers: z.number().min(1).max(10),
  shoeSizes: z.array(z.number().min(1).max(15)).optional(),
  packageIds: z.array(z.string()).optional(),
  productItems: z.array(z.object({ productId: z.string(), quantity: z.number().min(1).max(10) })).optional(),
})

async function findOrCreateCustomer(customer: {
  email: string
  firstName: string
  lastName: string
  phone: string
}): Promise<string> {
  const email = customer.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
      },
    })
    return existing.id
  }
  const passwordHash = await hashPassword(crypto.randomUUID())
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'CUSTOMER',
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
  })
  return user.id
}

async function calculateBookingPriceCents(
  duration: number,
  numBowlers: number,
  shoeSizes: number[],
  packagePrices: number[],
  numLanes: number,
  productTotalCents: number
): Promise<number> {
  const pricing = await getPricingSettings()
  const hours = Math.ceil(duration / 60)
  const laneRentalCents = Math.round(pricing.laneRentalPerHour * 100 * hours * numLanes)
  const bowlerPriceCents = Math.round(numBowlers * (pricing.bowlerPricePerPerson || 0) * 100)
  const shoeRentalsCents = Math.round(shoeSizes.length * pricing.shoeRental * 100)
  const packageTotal = packagePrices.reduce((a, b) => a + b, 0)
  const subtotal = laneRentalCents + bowlerPriceCents + shoeRentalsCents + packageTotal + productTotalCents
  return subtotal + Math.round(subtotal * pricing.taxRate)
}

/**
 * GET /api/v1/bookings?email=...
 * List bookings for a customer by email. Requires scope bookings:read.
 */
export async function GET(request: NextRequest) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) return unauthorizedResponse()
  if (!requireScope(apiKey, 'bookings:read')) return forbiddenResponse()

  const email = request.nextUrl.searchParams.get('email')
  if (!email || !email.trim()) {
    return NextResponse.json(
      { error: 'Query parameter "email" is required' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ bookings: [] })
  }

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: {
      bookingPackages: { include: { package: true } },
      bookingProducts: { include: { product: true } },
    },
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    take: 50,
  })

  const serialized = bookings.map((b) => ({
    id: b.id,
    date: b.date.toISOString().slice(0, 10),
    startTime: b.startTime,
    duration: b.duration,
    lane: b.lane,
    lanes: b.lanes ? (JSON.parse(b.lanes) as number[]) : null,
    numBowlers: b.numBowlers,
    status: b.status,
    totalPrice: Number(b.totalPrice),
    createdAt: b.createdAt.toISOString(),
    packages: b.bookingPackages.map((bp) => ({
      name: bp.package.name,
      quantity: bp.quantity,
    })),
    products: b.bookingProducts?.map((bp) => ({
      name: bp.product.name,
      quantity: bp.quantity,
    })) ?? [],
  }))

  return NextResponse.json({ bookings: serialized })
}

/**
 * POST /api/v1/bookings
 * Create a booking for a customer (find or create by email). Requires scope bookings:write.
 * Body: { customer: { email, firstName, lastName, phone }, date, startTime, duration, numLanes?, numBowlers, shoeSizes?, packageIds?, productItems? }
 */
export async function POST(request: NextRequest) {
  const apiKey = await validateApiKey(request)
  if (!apiKey) return unauthorizedResponse()
  if (!requireScope(apiKey, 'bookings:write')) return forbiddenResponse()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = v1BookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data = parsed.data
  const numLanes = data.numLanes ?? 1

  const userId = await findOrCreateCustomer(data.customer)
  const bookingDate = parse(data.date, 'yyyy-MM-dd', new Date())

  const availability = await isTimeSlotAvailable(
    bookingDate,
    data.startTime,
    data.duration
  )
  if (!availability.available || availability.availableLanes.length < numLanes) {
    return NextResponse.json(
      { error: 'Selected time slot is not available or has insufficient lanes' },
      { status: 400 }
    )
  }
  // Prefer adjacent lanes (next to one another)
  function pickAdjacentLanes(available: number[], count: number): number[] {
    if (count <= 0 || available.length < count) return available.slice(0, count)
    for (let i = 0; i <= available.length - count; i++) {
      const slice = available.slice(i, i + count)
      const isAdjacent = slice.every((lane, j) => j === 0 || lane === slice[j - 1] + 1)
      if (isAdjacent) return slice
    }
    return available.slice(0, count)
  }
  const assignedLanes = pickAdjacentLanes(availability.availableLanes, numLanes)
  const assignedLane = assignedLanes[0]

  let packagePrices: number[] = []
  if (data.packageIds?.length) {
    const packages = await prisma.package.findMany({
      where: { id: { in: data.packageIds }, isActive: true },
    })
    packagePrices = packages.map((p) => Number(p.price) * 100)
  }
  let productTotalCents = 0
  const productItems = data.productItems ?? []
  if (productItems.length > 0) {
    const productIds = [...new Set(productItems.map((i) => i.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    })
    const priceMap = Object.fromEntries(products.map((p) => [p.id, Number(p.price) * 100]))
    for (const item of productItems) {
      productTotalCents += (priceMap[item.productId] ?? 0) * item.quantity
    }
  }

  const totalPriceCents = await calculateBookingPriceCents(
    data.duration,
    data.numBowlers,
    data.shoeSizes ?? [],
    packagePrices,
    numLanes,
    productTotalCents
  )

  const checkInToken = await generateUniqueCheckInToken((token) =>
    prisma.booking.findUnique({ where: { checkInToken: token }, select: { id: true } }).then((b) => !!b)
  )

  const booking = await prisma.booking.create({
    data: {
      userId,
      date: bookingDate,
      startTime: data.startTime,
      duration: data.duration,
      lane: assignedLane,
      lanes: numLanes > 1 ? JSON.stringify(assignedLanes) : null,
      numBowlers: data.numBowlers,
      shoeSizes: data.shoeSizes ? JSON.stringify(data.shoeSizes) : null,
      status: 'PENDING',
      totalPrice: totalPriceCents / 100,
      checkInToken,
    },
  })

  if (data.packageIds?.length) {
    await prisma.bookingPackage.createMany({
      data: data.packageIds.map((packageId) => ({
        bookingId: booking.id,
        packageId,
        quantity: 1,
      })),
    })
  }
  if (productItems.length > 0) {
    await prisma.bookingProduct.createMany({
      data: productItems.map((item) => ({
        bookingId: booking.id,
        productId: item.productId,
        quantity: item.quantity,
      })),
    })
  }

  const bookingWithPackages = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: {
      user: { select: { email: true } },
      bookingPackages: { include: { package: true } },
      bookingProducts: { include: { product: true } },
    },
  })
  if (bookingWithPackages?.user?.email) {
    const forEmail = {
      ...bookingWithPackages,
      totalPrice: Number(bookingWithPackages.totalPrice),
      lanes: bookingWithPackages.lanes
        ? (JSON.parse(bookingWithPackages.lanes) as number[])
        : undefined,
      bookingPackages: bookingWithPackages.bookingPackages?.map((bp) => ({
        package: { name: bp.package.name, price: Number(bp.package.price) },
      })),
    }
    sendBookingConfirmationEmail(forEmail, bookingWithPackages.user.email).catch((err) =>
      console.error('[API v1] confirmation email failed:', err)
    )
  }

  return NextResponse.json(
    {
      booking: {
        id: booking.id,
        date: data.date,
        startTime: data.startTime,
        duration: data.duration,
        lane: assignedLane,
        lanes: numLanes > 1 ? assignedLanes : undefined,
        numBowlers: data.numBowlers,
        status: booking.status,
        totalPrice: Number(booking.totalPrice),
      },
    },
    { status: 201 }
  )
}
