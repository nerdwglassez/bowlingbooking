import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
    const admin = await prisma.user.create({
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
    { key: 'shoeRental', value: '5.0', description: 'Shoe rental price per pair in dollars' },
    { key: 'taxRate', value: '0.08', description: 'Tax rate as decimal (0.08 = 8%)' },
  ]

  for (const setting of defaultSettings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }
  console.log('✅ Created default pricing settings')

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

