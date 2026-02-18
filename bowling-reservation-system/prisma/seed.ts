import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { addDays, format } from 'date-fns'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const adminEmail = 'admin@bowling.com'
  const adminPassword = 'Admin123!'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const passwordHash = await hashPassword(adminPassword)
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    })
    console.log(`✅ Created admin user: ${adminEmail} / ${adminPassword}`)
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`)
  }

  // Test users for login state (shared password for easy testing)
  const testPassword = 'Test123!'
  const testUsers = [
    { email: 'staff@bowling.com', role: 'STAFF' as const },
    { email: 'manager@bowling.com', role: 'MANAGER' as const },
    { email: 'customer@bowling.com', role: 'CUSTOMER' as const },
  ]
  for (const { email, role } of testUsers) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (!existing) {
      const passwordHash = await hashPassword(testPassword)
      await prisma.user.create({
        data: { email, passwordHash, role },
      })
      console.log(`✅ Created ${role.toLowerCase()} user: ${email} / ${testPassword}`)
    } else {
      console.log(`ℹ️  User already exists: ${email}`)
    }
  }

  // Create default operating hours (Monday-Sunday, 9 AM - 10 PM)
  const days = [
    { dayOfWeek: 0, name: 'Sunday' },
    { dayOfWeek: 1, name: 'Monday' },
    { dayOfWeek: 2, name: 'Tuesday' },
    { dayOfWeek: 3, name: 'Wednesday' },
    { dayOfWeek: 4, name: 'Thursday' },
    { dayOfWeek: 5, name: 'Friday' },
    { dayOfWeek: 6, name: 'Saturday' },
  ]

  for (const day of days) {
    const existing = await prisma.operatingHours.findUnique({
      where: { dayOfWeek: day.dayOfWeek },
    })

    if (!existing) {
      await prisma.operatingHours.create({
        data: {
          dayOfWeek: day.dayOfWeek,
          openTime: '09:00',
          closeTime: '22:00',
          isClosed: false,
        },
      })
      console.log(`✅ Created operating hours for ${day.name}`)
    } else {
      console.log(`ℹ️  Operating hours already exist for ${day.name}`)
    }
  }

  // Initialize default pricing settings
  const defaultSettings = [
    { key: 'laneRentalPerHour', value: '30.0', description: 'Lane rental price per hour in dollars' },
    { key: 'bowlerPricePerPerson', value: '0.0', description: 'Per-bowler base price in dollars' },
    { key: 'shoeRental', value: '5.0', description: 'Shoe rental price per pair in dollars' },
    { key: 'taxRate', value: '0.08', description: 'Tax rate as decimal (0.08 = 8%)' },
    { key: 'totalLanes', value: '20', description: 'Total lanes available at the center' },
    { key: 'reserveLanes', value: '0', description: 'Number of lanes held in reserve for operations' },
  ]

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('✅ Created default pricing settings')

  // Seed fake packages for catalog browsing/testing
  const fakePackages = [
    {
      name: 'Family Fun Pack',
      description: '2 hours of bowling for up to 6 guests with shoe rentals included.',
      price: 89.0,
      type: 'PARTY',
      baseGuestCount: 6,
      durationMinutes: 120,
      maxCapacity: 8,
      featured: true,
      displayOrder: 1,
    },
    {
      name: 'Birthday Bash',
      description: 'Party package with lane time and celebration setup for birthdays.',
      price: 149.0,
      type: 'PARTY',
      baseGuestCount: 10,
      durationMinutes: 120,
      maxCapacity: 14,
      featured: true,
      displayOrder: 2,
    },
    {
      name: 'Corporate Team Night',
      description: 'Team-building package with reserved lanes and extended time.',
      price: 199.0,
      type: 'PARTY',
      baseGuestCount: 12,
      durationMinutes: 180,
      maxCapacity: 18,
      featured: false,
      displayOrder: 3,
    },
    {
      name: 'Pizza & Pitcher Combo',
      description: 'Large pizza and soft-drink pitcher add-on for your group.',
      price: 39.0,
      type: 'FOOD',
      baseGuestCount: 4,
      durationMinutes: 60,
      maxCapacity: 8,
      featured: false,
      displayOrder: 4,
    },
    {
      name: 'Snack Sampler Tray',
      description: 'Shareable tray with fries, wings, and mozzarella sticks.',
      price: 29.0,
      type: 'FOOD',
      baseGuestCount: 4,
      durationMinutes: 60,
      maxCapacity: 6,
      featured: false,
      displayOrder: 5,
    },
    {
      name: 'Mocktail Pitcher',
      description: 'Refreshing non-alcoholic drink pitcher for lane-side service.',
      price: 18.0,
      type: 'DRINK',
      baseGuestCount: 4,
      durationMinutes: 60,
      maxCapacity: 8,
      featured: false,
      displayOrder: 6,
    },
    {
      name: 'Arcade Bonus Bundle',
      description: 'Arcade credit bundle to pair with your bowling reservation.',
      price: 25.0,
      type: 'ARCADE',
      baseGuestCount: 2,
      durationMinutes: 60,
      maxCapacity: 6,
      featured: false,
      displayOrder: 7,
    },
  ]

  let createdPackages = 0
  for (const pkg of fakePackages) {
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } })
    if (existing) {
      await prisma.package.update({
        where: { id: existing.id },
        data: {
          description: pkg.description,
          price: pkg.price,
          type: pkg.type,
          isActive: true,
          baseGuestCount: pkg.baseGuestCount,
          durationMinutes: pkg.durationMinutes,
          maxCapacity: pkg.maxCapacity,
          featured: pkg.featured,
          displayOrder: pkg.displayOrder,
        },
      })
    } else {
      await prisma.package.create({
        data: {
          name: pkg.name,
          description: pkg.description,
          price: pkg.price,
          type: pkg.type,
          isActive: true,
          baseGuestCount: pkg.baseGuestCount,
          durationMinutes: pkg.durationMinutes,
          maxCapacity: pkg.maxCapacity,
          featured: pkg.featured,
          displayOrder: pkg.displayOrder,
        },
      })
      createdPackages++
    }
  }
  console.log(`✅ Seeded fake packages (${createdPackages} new, ${fakePackages.length - createdPackages} updated)`)

  // Heavier sample bookings for stress-testing availability and calendar density
  const customer = await prisma.user.findUnique({
    where: { email: 'customer@bowling.com' },
  })
  if (customer) {
    const baseDate = new Date()
    baseDate.setHours(0, 0, 0, 0)
    const starts = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
    const durations = [60, 90, 120]
    const SEED_DAYS = 21
    const activePackages = await prisma.package.findMany({
      where: { isActive: true },
      select: { id: true },
      orderBy: [{ featured: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
    })

    let createdBookings = 0
    for (let d = 0; d < SEED_DAYS; d++) {
      const date = addDays(baseDate, d)
      const laneBase = (d % 6) + 1
      const numEntries = 4 + (d % 3) // alternate 4/5/6 bookings per day
      for (let i = 0; i < numEntries; i++) {
        const startTime = starts[(d * 2 + i * 3) % starts.length]
        const duration = durations[(d + i) % durations.length]
        const numBowlers = 2 + ((d + i * 2) % 9) // 2..10
        const numLanes = numBowlers > 6 ? 2 : 1
        const lane = laneBase + i
        const lanes = numLanes === 2 ? JSON.stringify([lane, lane + 1]) : null

        const existing = await prisma.booking.findFirst({
          where: {
            userId: customer.id,
            date,
            startTime,
            lane,
          },
          select: { id: true },
        })
        if (existing) continue

        const booking = await prisma.booking.create({
          data: {
            userId: customer.id,
            date,
            startTime,
            duration,
            lane,
            lanes,
            numBowlers,
            status: (d + i) % 3 === 0 ? 'CONFIRMED' : 'PAID',
            totalPrice: numLanes === 2 ? 99.0 : 49.0,
          },
        })
        createdBookings++

        if (activePackages.length > 0 && (d + i) % 2 === 0) {
          const packageId = activePackages[(d + i) % activePackages.length].id
          await prisma.bookingPackage.create({
            data: {
              bookingId: booking.id,
              packageId,
              quantity: 1,
            },
          })
        }
      }
    }
    console.log(`✅ Seeded fake reservations (${createdBookings} new over next ${SEED_DAYS} days)`)
  }

  console.log('✨ Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

